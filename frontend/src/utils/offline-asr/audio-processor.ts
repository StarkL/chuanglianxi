/**
 * 音频采集与 16kHz PCM 重采样处理器 (Web Audio API)
 * 功能职责：
 * 1. 麦克风流申请与降噪参数配置 (回声消除、底噪抑制、自动增益)
 * 2. 硬件原生采样率 (44.1kHz / 48kHz) ➔ 16,000Hz 线性高质量降采样
 * 3. 实时 RMS 能量监测，输出 0~100 音量电平驱动界面声波动画
 * 4. 输出标准化 16-bit 等效 Float32Array PCM 音频数据
 */

export interface AudioCaptureOptions {
  sampleRate?: number        // 目标采样率，默认 16000
  bufferSize?: number        // ScriptProcessor 帧大小，默认 4096
  onVolume?: (level: number) => void // 实时音量回调 (0 ~ 100)
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private analyserNode: AnalyserNode | null = null
  private isRecording: boolean = false
  private recordedChunks: Float32Array[] = []
  private totalSamples: number = 0
  private targetSampleRate: number = 16000
  private onVolumeCallback?: (level: number) => void
  private volumeRafId: number | null = null

  constructor(options: AudioCaptureOptions = {}) {
    this.targetSampleRate = options.sampleRate || 16000
    this.onVolumeCallback = options.onVolume
  }

  /**
   * 检查浏览器麦克风支持
   */
  public static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined')
    )
  }

  /**
   * 开始录音与音频采集
   */
  public async start(): Promise<void> {
    if (this.isRecording) return

    if (!AudioProcessor.isSupported()) {
      throw new Error('当前浏览器不支持录音功能，请使用现代浏览器')
    }

    // 1. 获取麦克风流
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('麦克风权限被拒绝，请在浏览器地址栏允许麦克风访问')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('未检测到可用的麦克风输入设备')
      } else {
        throw new Error(`无法启动麦克风: ${err.message || err.name}`)
      }
    }

    // 2. 初始化 AudioContext
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    this.audioContext = new AudioCtx()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const inputSampleRate = this.audioContext.sampleRate
    this.recordedChunks = []
    this.totalSamples = 0
    this.isRecording = true

    // 3. 构建音频处理图: Source -> Analyser -> ScriptProcessor -> Destination
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.sourceNode.connect(this.analyserNode)
    this.analyserNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)

    // 4. 实时音频采样与重采样
    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this.isRecording) return

      const inputBuffer = event.inputBuffer.getChannelData(0)
      // 若硬件输入采样率与目标 16kHz 一致，直接克隆；否则执行高精度重采样
      const resampled = inputSampleRate === this.targetSampleRate
        ? new Float32Array(inputBuffer)
        : this.resample(inputBuffer, inputSampleRate, this.targetSampleRate)

      this.recordedChunks.push(resampled)
      this.totalSamples += resampled.length
    }

    // 5. 启动音量计量动画循环
    this.startVolumeMonitoring()
  }

  /**
   * 停止录音并返回整合后的 16kHz Float32Array PCM 数据
   */
  public async stop(): Promise<Float32Array> {
    this.isRecording = false
    this.stopVolumeMonitoring()

    // 断开所有音频节点连接
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // 停止硬件麦克风采集轨道
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    // 关闭 AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
      } catch (e) {
        console.warn('关闭 AudioContext 异常:', e)
      }
      this.audioContext = null
    }

    // 合并全部录音片段为单一连续 Float32Array
    const merged = new Float32Array(this.totalSamples)
    let offset = 0
    for (const chunk of this.recordedChunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    this.recordedChunks = []
    this.totalSamples = 0

    return merged
  }

  /**
   * 线性插值音频重采样算法 (48kHz/44.1kHz -> 16kHz)
   */
  private resample(
    source: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate === toRate) return new Float32Array(source)

    const ratio = fromRate / toRate
    const targetLength = Math.round(source.length / ratio)
    const result = new Float32Array(targetLength)

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio
      const indexFloor = Math.floor(srcIndex)
      const indexCeil = Math.min(indexFloor + 1, source.length - 1)
      const fraction = srcIndex - indexFloor

      // 线性平滑插值
      result[i] = source[indexFloor] * (1 - fraction) + source[indexCeil] * fraction
    }

    return result
  }

  /**
   * 启动音量能量循环侦测 (0 ~ 100)
   */
  private startVolumeMonitoring() {
    if (!this.onVolumeCallback || !this.analyserNode) return

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)

    const checkVolume = () => {
      if (!this.isRecording || !this.analyserNode) return

      this.analyserNode.getByteTimeDomainData(dataArray)
      let sumSquares = 0
      for (let i = 0; i < dataArray.length; i++) {
        // 归一化为 [-1, 1]
        const normalized = (dataArray[i] - 128) / 128
        sumSquares += normalized * normalized
      }

      const rms = Math.sqrt(sumSquares / dataArray.length)
      // 动态映射到 0~100 区间，并增加微小非线性提亮
      const level = Math.min(100, Math.round(Math.pow(rms * 2.5, 0.7) * 100))

      if (this.onVolumeCallback) {
        this.onVolumeCallback(level)
      }

      this.volumeRafId = requestAnimationFrame(checkVolume)
    }

    this.volumeRafId = requestAnimationFrame(checkVolume)
  }

  /**
   * 停止音量监控
   */
  private stopVolumeMonitoring() {
    if (this.volumeRafId !== null) {
      cancelAnimationFrame(this.volumeRafId)
      this.volumeRafId = null
    }
    if (this.onVolumeCallback) {
      this.onVolumeCallback(0)
    }
  }

  /**
   * 获取当前录音状态
   */
  public getIsRecording(): boolean {
    return this.isRecording
  }
}
