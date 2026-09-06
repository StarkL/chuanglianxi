/**
 * 80维 Mel 频谱 (Fbank) 端侧特征提取器
 * 遵循 ASR 标准声学前处理流程：
 * 1. 预加重 (Pre-emphasis, 系数 0.97)
 * 2. 分帧与加汉明窗 (Frame Length 25ms = 400采样点, Frame Shift 10ms = 160采样点)
 * 3. 快速傅里叶变换 (FFT / DFT) 计算能量谱
 * 4. 三角梅尔滤波器组 (80 组, 20Hz ~ 8000Hz) 能量积分
 * 5. 对数压缩 (Log Compression) 与 倒谱均值方差归一化 (CMVN)
 */

export interface FbankOptions {
  sampleRate?: number        // 采样率，默认 16000
  frameLengthMs?: number     // 帧长毫秒，默认 25ms
  frameShiftMs?: number      // 帧移毫秒，默认 10ms
  numMelBins?: number        // 梅尔滤波器数量，默认 80
  lowFreq?: number           // 最低截止频率，默认 20Hz
  highFreq?: number          // 最高截止频率，默认 8000Hz
  dither?: number            // 抖动系数，避免全静音 log(0)
}

/**
 * 赫兹 (Hz) 转换为 梅尔 (Mel) 刻度
 */
export function hzToMel(hz: number): number {
  return 1127.0 * Math.log(1.0 + hz / 700.0)
}

/**
 * 梅尔 (Mel) 刻度转换为 赫兹 (Hz)
 */
export function melToHz(mel: number): number {
  return 700.0 * (Math.exp(mel / 1127.0) - 1.0)
}

/**
 * 生成三角梅尔滤波器组矩阵
 * 返回大小为 [numMelBins][fftSize / 2 + 1] 的权重矩阵
 */
export function createMelFilterbank(
  sampleRate: number,
  fftSize: number,
  numMelBins: number = 80,
  lowFreq: number = 20,
  highFreq: number = 8000
): Float32Array[] {
  const numFftBins = Math.floor(fftSize / 2) + 1
  const lowMel = hzToMel(lowFreq)
  const highMel = hzToMel(highFreq)
  const melStep = (highMel - lowMel) / (numMelBins + 1)

  // 计算每个滤波器中心频点的 FFT bin 索引
  const melPoints = new Float32Array(numMelBins + 2)
  const binIndices = new Int32Array(numMelBins + 2)

  for (let i = 0; i < numMelBins + 2; i++) {
    melPoints[i] = lowMel + i * melStep
    const hz = melToHz(melPoints[i])
    binIndices[i] = Math.floor(((fftSize + 1) * hz) / sampleRate)
  }

  const filters: Float32Array[] = []

  for (let m = 0; m < numMelBins; m++) {
    const filter = new Float32Array(numFftBins)
    const left = binIndices[m]
    const center = binIndices[m + 1]
    const right = binIndices[m + 2]

    // 上升斜坡
    for (let k = left; k < center; k++) {
      if (k >= 0 && k < numFftBins && center > left) {
        filter[k] = (k - left) / (center - left)
      }
    }

    // 下降斜坡
    for (let k = center; k < right; k++) {
      if (k >= 0 && k < numFftBins && right > center) {
        filter[k] = (right - k) / (right - center)
      }
    }

    filters.push(filter)
  }

  return filters
}

/**
 * 一维实数快速傅里叶变换 (Cooley-Tukey Radix-2 FFT)
 * 要求 n 必须为 2 的整数幂（如 512）
 */
export function rfftPowerSpectrum(signal: Float32Array, fftSize: number): Float32Array {
  // 零填充至 fftSize
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)
  real.set(signal.subarray(0, Math.min(signal.length, fftSize)))

  // 位反转置换 (Bit Reversal)
  let j = 0
  for (let i = 0; i < fftSize - 1; i++) {
    if (i < j) {
      const tempR = real[i]
      real[i] = real[j]
      real[j] = tempR
    }
    let k = fftSize >> 1
    while (k <= j) {
      j -= k
      k >>= 1
    }
    j += k
  }

  // 蝶形运算
  for (let len = 2; len <= fftSize; len <<= 1) {
    const half = len >> 1
    const angle = (-2.0 * Math.PI) / len
    const wStepR = Math.cos(angle)
    const wStepI = Math.sin(angle)

    for (let i = 0; i < fftSize; i += len) {
      let wR = 1.0
      let wI = 0.0
      for (let k = 0; k < half; k++) {
        const uR = real[i + k]
        const uI = imag[i + k]
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR

        real[i + k] = uR + vR
        imag[i + k] = uI + vI
        real[i + k + half] = uR - vR
        imag[i + k + half] = uI - vI

        const nextWR = wR * wStepR - wI * wStepI
        wI = wR * wStepI + wI * wStepR
        wR = nextWR
      }
    }
  }

  // 计算实数半谱功率: |X[k]|^2 (0 <= k <= fftSize / 2)
  const numBins = Math.floor(fftSize / 2) + 1
  const power = new Float32Array(numBins)
  for (let k = 0; k < numBins; k++) {
    power[k] = real[k] * real[k] + imag[k] * imag[k]
  }

  return power
}

/**
 * 提取 16kHz PCM 音频的 80 维 Fbank 特征矩阵
 * @param pcm 16kHz 单声道音频样本（-1.0 ~ 1.0）
 * @returns 二维特征矩阵 [numFrames, 80]
 */
export function computeFbank(pcm: Float32Array, options: FbankOptions = {}): Float32Array[] {
  const sampleRate = options.sampleRate || 16000
  const frameLength = Math.round((options.frameLengthMs || 25) * (sampleRate / 1000)) // 400
  const frameShift = Math.round((options.frameShiftMs || 10) * (sampleRate / 1000))   // 160
  const numMelBins = options.numMelBins || 80
  const lowFreq = options.lowFreq || 20
  const highFreq = options.highFreq || 8000
  const dither = options.dither ?? 0.0

  if (pcm.length < frameLength) {
    return []
  }

  // 1. 计算 FFT 窗长（大于等于 frameLength 的最小 2 的幂次，400 -> 512）
  let fftSize = 1
  while (fftSize < frameLength) {
    fftSize <<= 1
  }

  // 2. 预计算汉明窗 (Hamming Window)
  const hammingWindow = new Float32Array(frameLength)
  for (let i = 0; i < frameLength; i++) {
    hammingWindow[i] = 0.54 - 0.46 * Math.cos((2.0 * Math.PI * i) / (frameLength - 1))
  }

  // 3. 构建梅尔滤波器组
  const filterbank = createMelFilterbank(sampleRate, fftSize, numMelBins, lowFreq, highFreq)

  // 4. 预加重 (Pre-emphasis)
  const emphasized = new Float32Array(pcm.length)
  emphasized[0] = pcm[0]
  for (let i = 1; i < pcm.length; i++) {
    emphasized[i] = pcm[i] - 0.97 * pcm[i - 1]
  }

  // 5. 分帧处理
  const numFrames = Math.floor((emphasized.length - frameLength) / frameShift) + 1
  const fbankFeatures: Float32Array[] = []

  const frameBuffer = new Float32Array(frameLength)

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameShift

    // 截取帧样本并施加汉明窗
    for (let i = 0; i < frameLength; i++) {
      let sample = emphasized[start + i]
      if (dither > 0) {
        sample += (Math.random() - 0.5) * dither
      }
      frameBuffer[i] = sample * hammingWindow[i]
    }

    // 计算功率谱
    const powerSpectrum = rfftPowerSpectrum(frameBuffer, fftSize)

    // 滤波与对数压缩
    const melEnergies = new Float32Array(numMelBins)
    for (let m = 0; m < numMelBins; m++) {
      let energy = 0.0
      const filter = filterbank[m]
      for (let k = 0; k < powerSpectrum.length; k++) {
        energy += powerSpectrum[k] * filter[k]
      }
      // 避免 log(0)，加入微小底噪保护
      melEnergies[m] = Math.log(Math.max(energy, 1e-5))
    }

    fbankFeatures.push(melEnergies)
  }

  // 6. 全局 CMVN 均值归一化 (Cepstral Mean Normalization)
  if (fbankFeatures.length > 0) {
    const means = new Float32Array(numMelBins)
    for (let f = 0; f < fbankFeatures.length; f++) {
      const frame = fbankFeatures[f]
      for (let m = 0; m < numMelBins; m++) {
        means[m] += frame[m]
      }
    }
    for (let m = 0; m < numMelBins; m++) {
      means[m] /= fbankFeatures.length
    }
    for (let f = 0; f < fbankFeatures.length; f++) {
      const frame = fbankFeatures[f]
      for (let m = 0; m < numMelBins; m++) {
        frame[m] -= means[m]
      }
    }
  }

  return fbankFeatures
}
