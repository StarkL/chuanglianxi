/**
 * 端侧离线 ASR Web Worker (适配 SenseVoice CTC 模型)
 * 特征流水线: PCM → 80维Fbank → LFR(7×80=560) → CMVN → ONNX推理 → CTC解码 → 文本
 */

// 顶层 import，让 Vite 打包时处理依赖（blob URL Worker 无法动态 import）
// @ts-ignore - onnxruntime-web in Worker
import * as ort from 'onnxruntime-web'

// 日志转发到主线程
const sendLog = (level: string, args: any[]) => {
  try { self.postMessage({ type: 'LOG', level, args: args.map(String) }) } catch {}
}
const _log = console.log, _warn = console.warn, _error = console.error
console.log = (...args: any[]) => { sendLog('log', args); _log(...args) }
console.warn = (...args: any[]) => { sendLog('warn', args); _warn(...args) }
console.error = (...args: any[]) => { sendLog('error', args); _error(...args) }

// 全局错误捕获
self.onerror = (msg, url, line, col, err) => {
  console.error('[ASR Worker] 全局错误:', msg, 'at', url + ':' + line + ':' + col)
}
self.onunhandledrejection = (e) => {
  console.error('[ASR Worker] 未处理的 Promise 拒绝:', e.reason)
}

console.log('[ASR Worker] Worker 脚本已加载, ort 版本:', (ort as any)?.version || 'unknown')

// 模型参数（从 ONNX metadata 提取）
const LFR_WINDOW_SIZE = 7
const LFR_WINDOW_SHIFT = 6
const FBANK_DIM = 80
const LFR_DIM = FBANK_DIM * LFR_WINDOW_SIZE // 560
const SAMPLE_RATE = 16000
const FRAME_LENGTH_MS = 25
const FRAME_SHIFT_MS = 10
const LANG_ZH = 3
const WITH_ITN = 14

// 标点映射
const PUNCTUATION_MAP: Record<string, string> = {
  '<|comma|>': '，', '<|period|>': '。', '<|questionmark|>': '？',
  '<|exclamation|>': '！', '<|pause|>': '、',
  '<|punc_comma|>': '，', '<|punc_period|>': '。',
  '<|punc_question|>': '？', '<|punc_exclamation|>': '！',
}

const EMOTION_MAP: Record<string, string> = {
  '<|NEUTRAL|>': 'neutral', '<|HAPPY|>': 'happy',
  '<|SAD|>': 'sad', '<|ANGRY|>': 'angry',
}

const LANGUAGE_MAP: Record<string, string> = {
  '<|zh|>': 'zh', '<|en|>': 'en', '<|yue|>': 'yue',
  '<|ja|>': 'ja', '<|ko|>': 'ko',
}

let session: ort.InferenceSession | null = null
let vocabList: string[] = []
let negMean: Float32Array | null = null
let invStddev: Float32Array | null = null

/**
 * 初始化 ONNX 会话
 */
async function initSession(modelBuffer: ArrayBuffer, vocab: string[], cmvnNegMean: number[], cmvnInvStddev: number[]): Promise<void> {
  if (session) return

  console.log('[ASR Worker] 开始初始化 ONNX 会话...')
  console.log('[ASR Worker] 模型大小:', modelBuffer.byteLength, 'bytes')
  console.log('[ASR Worker] 词表大小:', vocab.length, 'tokens')
  console.log('[ASR Worker] CMVN 参数:', cmvnNegMean.length, 'values')

  // 配置 WASM 后端：使用非 JSEP 版本，避免 Vite 动态 import 问题
  ort.env.wasm.wasmPaths = '/crm/'
  ort.env.wasm.numThreads = 2
  // 禁用 JSEP（需要动态 import .mjs 文件，Vite 开发环境不支持）
  ;(ort.env.wasm as any).enableJsep = false

  try {
    session = await ort.InferenceSession.create(new Uint8Array(modelBuffer), {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
    })

    vocabList = vocab
    negMean = new Float32Array(cmvnNegMean)
    invStddev = new Float32Array(cmvnInvStddev)

    console.log('[ASR Worker] ✅ ONNX 会话初始化成功!')
    console.log('[ASR Worker] 输入 tensors:', session.inputNames)
    console.log('[ASR Worker] 输出 tensors:', session.outputNames)
  } catch (err) {
    console.error('[ASR Worker]  ONNX 会话初始化失败:', err)
    throw err
  }
}

// ===== 声学特征提取 =====

function hzToMel(hz: number): number { return 1127.0 * Math.log(1.0 + hz / 700.0) }
function melToHz(mel: number): number { return 700.0 * (Math.exp(mel / 1127.0) - 1.0) }

function createMelFilterbank(sampleRate: number, fftSize: number, numMelBins: number = 80, lowFreq: number = 20, highFreq: number = 0): Float32Array[] {
  const numFftBins = Math.floor(fftSize / 2) + 1
  const actualHighFreq = highFreq > 0 ? highFreq : sampleRate / 2 - 400
  const lowMel = hzToMel(lowFreq)
  const highMel = hzToMel(actualHighFreq)
  const melStep = (highMel - lowMel) / (numMelBins + 1)

  const binIndices = new Int32Array(numMelBins + 2)
  for (let i = 0; i < numMelBins + 2; i++) {
    const hz = melToHz(lowMel + i * melStep)
    binIndices[i] = Math.floor(((fftSize + 1) * hz) / sampleRate)
  }

  const filters: Float32Array[] = []
  for (let m = 0; m < numMelBins; m++) {
    const filter = new Float32Array(numFftBins)
    const left = binIndices[m], center = binIndices[m + 1], right = binIndices[m + 2]
    for (let k = left; k < center; k++) {
      if (k >= 0 && k < numFftBins && center > left) filter[k] = (k - left) / (center - left)
    }
    for (let k = center; k < right; k++) {
      if (k >= 0 && k < numFftBins && right > center) filter[k] = (right - k) / (right - center)
    }
    filters.push(filter)
  }
  return filters
}

function rfftPowerSpectrum(signal: Float32Array, fftSize: number): Float32Array {
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)
  real.set(signal.subarray(0, Math.min(signal.length, fftSize)))

  let j = 0
  for (let i = 0; i < fftSize - 1; i++) {
    if (i < j) { const t = real[i]; real[i] = real[j]; real[j] = t }
    let k = fftSize >> 1
    while (k <= j) { j -= k; k >>= 1 }
    j += k
  }

  for (let len = 2; len <= fftSize; len <<= 1) {
    const half = len >> 1
    const angle = (-2.0 * Math.PI) / len
    const wStepR = Math.cos(angle), wStepI = Math.sin(angle)
    for (let i = 0; i < fftSize; i += len) {
      let wR = 1.0, wI = 0.0
      for (let k = 0; k < half; k++) {
        const uR = real[i + k], uI = imag[i + k]
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR
        real[i + k] = uR + vR; imag[i + k] = uI + vI
        real[i + k + half] = uR - vR; imag[i + k + half] = uI - vI
        const nextWR = wR * wStepR - wI * wStepI
        wI = wR * wStepI + wI * wStepR; wR = nextWR
      }
    }
  }

  const numBins = Math.floor(fftSize / 2) + 1
  const power = new Float32Array(numBins)
  for (let k = 0; k < numBins; k++) power[k] = real[k] * real[k] + imag[k] * imag[k]
  return power
}

/**
 * 完整特征提取流水线: PCM → Fbank → LFR → CMVN
 */
function extractFeatures(pcm: Float32Array): Float32Array {
  const frameLength = Math.round(FRAME_LENGTH_MS * (SAMPLE_RATE / 1000)) // 400
  const frameShift = Math.round(FRAME_SHIFT_MS * (SAMPLE_RATE / 1000))   // 160

  let fftSize = 1
  while (fftSize < frameLength) fftSize <<= 1

  // Hamming 窗
  const hammingWindow = new Float32Array(frameLength)
  for (let i = 0; i < frameLength; i++) {
    hammingWindow[i] = 0.54 - 0.46 * Math.cos((2.0 * Math.PI * i) / (frameLength - 1))
  }

  const filterbank = createMelFilterbank(SAMPLE_RATE, fftSize, FBANK_DIM)

  // 预加重
  const emphasized = new Float32Array(pcm.length)
  emphasized[0] = pcm[0]
  for (let i = 1; i < pcm.length; i++) emphasized[i] = pcm[i] - 0.97 * pcm[i - 1]

  // 分帧 + Fbank
  const numFrames = Math.floor((emphasized.length - frameLength) / frameShift) + 1
  const fbankFrames: Float32Array[] = []
  const frameBuffer = new Float32Array(frameLength)

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameShift
    for (let i = 0; i < frameLength; i++) frameBuffer[i] = emphasized[start + i] * hammingWindow[i]
    const powerSpectrum = rfftPowerSpectrum(frameBuffer, fftSize)
    const melEnergies = new Float32Array(FBANK_DIM)
    for (let m = 0; m < FBANK_DIM; m++) {
      let energy = 0.0
      const filter = filterbank[m]
      for (let k = 0; k < powerSpectrum.length; k++) energy += powerSpectrum[k] * filter[k]
      melEnergies[m] = Math.log(Math.max(energy, 1e-5))
    }
    fbankFrames.push(melEnergies)
  }

  if (fbankFrames.length === 0) return new Float32Array(0)

  // LFR 帧拼接: 7帧→1帧, 滑动6帧, 输出 560 维
  const inputFrames = fbankFrames.length
  const outputFrames = Math.floor((inputFrames - LFR_WINDOW_SIZE) / LFR_WINDOW_SHIFT) + 1
  if (outputFrames <= 0) return new Float32Array(0)

  const lfrOutput = new Float32Array(outputFrames * LFR_DIM)
  const leftContext = Math.floor((LFR_WINDOW_SIZE - 1) / 2) // 3

  for (let i = 0; i < outputFrames; i++) {
    const centerFrame = i * LFR_WINDOW_SHIFT
    for (let j = 0; j < LFR_WINDOW_SIZE; j++) {
      let srcFrame = centerFrame - leftContext + j
      srcFrame = Math.max(0, Math.min(srcFrame, inputFrames - 1))
      const srcOffset = srcFrame * FBANK_DIM
      const dstOffset = i * LFR_DIM + j * FBANK_DIM
      lfrOutput.set(fbankFrames[srcFrame], dstOffset)
    }
  }

  // CMVN 归一化
  if (negMean && invStddev) {
    for (let i = 0; i < lfrOutput.length; i++) {
      lfrOutput[i] = (lfrOutput[i] + negMean[i % LFR_DIM]) * invStddev[i % LFR_DIM]
    }
  }

  return lfrOutput
}

// ===== CTC 解码 =====

function ctcGreedyDecode(tokenIds: number[], blankId: number = 0): number[] {
  const result: number[] = []
  let prevToken = -1
  for (let i = 0; i < tokenIds.length; i++) {
    const token = tokenIds[i]
    if (token !== prevToken) {
      if (token !== blankId) result.push(token)
      prevToken = token
    }
  }
  return result
}

function formatCjkText(rawText: string): string {
  if (!rawText) return ''
  let text = rawText.trim()
  for (const [tag, punc] of Object.entries(PUNCTUATION_MAP)) text = text.split(tag).join(punc)
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
  text = text.replace(/([\u4e00-\u9fa5])\s+([，。！？；：、""''【】（）])/g, '$1$2')
  text = text.replace(/([，。！？；：、""''【】（）])\s+([\u4e00-\u9fa5])/g, '$1$2')
  text = text.trim()
  if (text.length >= 4 && !/[。！？!?.]$/.test(text)) text += '。'
  return text
}

function decodeTokens(tokenIds: number[]): { text: string; emotion?: string; language?: string } {
  const tokens: string[] = []
  let emotion: string | undefined, language: string | undefined

  // SenseVoice 特殊 token 列表（需要过滤）
  const SKIP_TOKENS = new Set([
    '<|blank|>', '<|sos/eos|>', '<unk>', '<s>', '</s>',
    '<|EMO_UNKNOWN|>', '<|Speech|>', '<|withitn|>', '<|woitn|>',
    '<|startoftranscript|>', '<|endoftext|>',
  ])

  for (const id of tokenIds) {
    if (id < 0 || id >= vocabList.length) continue
    const token = vocabList[id]

    // 检查情绪标签
    if (EMOTION_MAP[token]) { emotion = EMOTION_MAP[token]; continue }
    // 检查语言标签
    if (LANGUAGE_MAP[token]) { language = LANGUAGE_MAP[token]; continue }
    // 跳过特殊 token
    if (SKIP_TOKENS.has(token)) continue
    // 跳过所有 <|...|> 格式的控制 token
    if (token.startsWith('<|') && token.endsWith('|>')) continue

    tokens.push(token)
  }

  return { text: tokens.join(''), emotion, language }
}

// ===== Worker 消息处理 =====

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data

  try {
    if (type === 'INIT_MODEL') {
      const { modelBuffer, vocab, negMean: nm, invStddev: isd } = payload
      console.log('[ASR Worker] 收到 INIT_MODEL, 模型大小:', modelBuffer.byteLength, '词表:', vocab.length)
      try {
        await initSession(modelBuffer, vocab, nm, isd)
        console.log('[ASR Worker] INIT_MODEL 成功')
        self.postMessage({ id, type: 'INIT_SUCCESS' })
      } catch (initErr: any) {
        console.error('[ASR Worker] INIT_MODEL 失败:', initErr)
        self.postMessage({ id, type: 'ERROR', error: 'INIT_MODEL failed: ' + (initErr.message || String(initErr)) })
      }
      return
    }

    if (type === 'TRANSCRIBE') {
      if (!session) throw new Error('模型未初始化')

      const { pcmBuffer, sampleRate } = payload
      const pcm = new Float32Array(pcmBuffer)
      const duration = pcm.length / (sampleRate || SAMPLE_RATE)

      if (pcm.length < 1600) {
        self.postMessage({ id, type: 'SUCCESS', result: { text: '', duration, emotion: 'neutral', confidence: 0, isModelLoaded: true } })
        return
      }

      // 1. 特征提取: PCM → Fbank → LFR → CMVN → [T, 560]
      const features = extractFeatures(pcm)
      if (features.length === 0) {
        self.postMessage({ id, type: 'SUCCESS', result: { text: '', duration, emotion: 'neutral', confidence: 0, isModelLoaded: true } })
        return
      }

      const numFrames = features.length / LFR_DIM

      // 2. 准备模型输入（注意：模型期望 int32 而非 int64）
      const xTensor = new ort.Tensor('float32', features, [1, numFrames, LFR_DIM])
      const xLengthTensor = new ort.Tensor('int32', [numFrames], [1])
      const languageTensor = new ort.Tensor('int32', [LANG_ZH], [1])
      const textNormTensor = new ort.Tensor('int32', [WITH_ITN], [1])

      // 3. ONNX 推理
      const feeds = { x: xTensor, x_length: xLengthTensor, language: languageTensor, text_norm: textNormTensor }
      const results = await session.run(feeds)

      // 4. 获取输出 logits
      const logits = results.logits.data as Float32Array
      const vocabSize = results.logits.dims[2]
      const timeSteps = results.logits.dims[1]

      // 5. Argmax 解码
      const tokenIds: number[] = []
      for (let t = 0; t < timeSteps; t++) {
        let maxIdx = 0, maxVal = -Infinity
        for (let v = 0; v < vocabSize; v++) {
          const val = logits[t * vocabSize + v]
          if (val > maxVal) { maxVal = val; maxIdx = v }
        }
        tokenIds.push(maxIdx)
      }

      // 6. CTC 解码 + 文本后处理
      const decodedIds = ctcGreedyDecode(tokenIds, 0)
      const { text: rawText, emotion, language } = decodeTokens(decodedIds)
      const text = formatCjkText(rawText)

      self.postMessage({
        id, type: 'SUCCESS',
        result: { text, duration, emotion: emotion || 'neutral', language: language || 'zh', confidence: 0.92, isModelLoaded: true }
      })
    }
  } catch (err: any) {
    console.error('[ASR Worker] 错误:', err)
    self.postMessage({ id, type: 'ERROR', error: err.message || String(err) })
  }
}
