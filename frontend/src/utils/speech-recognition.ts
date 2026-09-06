/**
 * 语音识别统一门面 (Speech Recognizer Facade)
 * 支持：
 * 1. 【默认】端侧离线模式 (Local-First Offline ASR)：
 *    - 基于 Web Audio API 16kHz 采集 + Web Worker 离线推理
 *    - 零音频上传、零网络流量损耗、零知识隐私保障
 *    - 实时 RMS 音量电平监听 (0~100) 驱动动态声波
 * 2. 【备选】云端 Web Speech API 模式：
 *    - 浏览器原生 SpeechRecognition / webkitSpeechRecognition
 */

import { AudioProcessor } from './offline-asr/audio-processor'
import { offlineAsrEngine, type TranscribeResult } from './offline-asr/asr-engine'
import { modelManager, type ModelStatus, type ModelProgressEvent } from './offline-asr/model-manager'
import { formatCjkText } from './offline-asr/decoder'

export type SpeechEngineMode = 'offline' | 'online'

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isOffline?: boolean
  duration?: number
  emotion?: string
}

export interface SpeechRecognizerOptions {
  engineMode?: SpeechEngineMode     // 识别引擎模式，默认 'offline' (本地优先)
  language?: string                 // 语言，默认 'zh-CN'
  continuous?: boolean              // 是否连续识别
  interimResults?: boolean          // 是否输出临时结果
  maxAlternatives?: number          // 最大候选数
  onVolume?: (level: number) => void // 实时音量回调 (0 ~ 100)
}

export class SpeechRecognizer {
  private engineMode: SpeechEngineMode = 'offline'
  private audioProcessor: AudioProcessor | null = null
  private onlineRecognition: any = null
  private isListening = false
  private options: Required<Omit<SpeechRecognizerOptions, 'onVolume'>> & { onVolume?: (level: number) => void }

  constructor(options: SpeechRecognizerOptions = {}) {
    this.engineMode = options.engineMode || 'offline'
    this.options = {
      engineMode: this.engineMode,
      language: options.language || 'zh-CN',
      continuous: options.continuous || false,
      interimResults: options.interimResults || false,
      maxAlternatives: options.maxAlternatives || 1,
      onVolume: options.onVolume
    }

    // 初始化云端 Web Speech API (若可用)
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        this.onlineRecognition = new SpeechRecognitionAPI()
        this.onlineRecognition.lang = this.options.language
        this.onlineRecognition.continuous = this.options.continuous
        this.onlineRecognition.interimResults = this.options.interimResults
        this.onlineRecognition.maxAlternatives = this.options.maxAlternatives
      }
    }
  }

  /**
   * 检查当前浏览器是否支持端侧录音与本地 ASR
   */
  static isOfflineSupported(): boolean {
    return AudioProcessor.isSupported()
  }

  /**
   * 检查当前浏览器是否支持云端 Web Speech API
   */
  static isOnlineSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    )
  }

  /**
   * 综合检查是否具备语音识别能力 (离线或在线任一支持即可)
   */
  static isSupported(): boolean {
    return SpeechRecognizer.isOfflineSupported() || SpeechRecognizer.isOnlineSupported()
  }

  /**
   * 切换识别引擎模式 ('offline' | 'online')
   */
  public setEngineMode(mode: SpeechEngineMode) {
    this.engineMode = mode
    this.options.engineMode = mode
  }

  /**
   * 获取当前生效的识别引擎模式
   */
  public getEngineMode(): SpeechEngineMode {
    return this.engineMode
  }

  /**
   * 开始录音并进行语音识别
   */
  public async start(): Promise<SpeechRecognitionResult> {
    if (this.isListening) {
      throw new Error('正在录音中')
    }

    // 优先执行端侧本地离线模式
    if (this.engineMode === 'offline') {
      return this.startOfflineRecognition()
    } else {
      return this.startOnlineRecognition()
    }
  }

  /**
   * 端侧离线录音与推理流程
   */
  private async startOfflineRecognition(): Promise<SpeechRecognitionResult> {
    if (!AudioProcessor.isSupported()) {
      // 若不支持 Web Audio，尝试降级到云端 Web Speech
      if (SpeechRecognizer.isOnlineSupported()) {
        console.warn('设备不支持本地音频采集，自动降级至 Web Speech API')
        this.engineMode = 'online'
        return this.startOnlineRecognition()
      }
      throw new Error('当前浏览器不支持录音功能，请使用现代浏览器')
    }

    this.audioProcessor = new AudioProcessor({
      sampleRate: 16000,
      onVolume: this.options.onVolume
    })

    this.isListening = true
    await this.audioProcessor.start()

    // 返回一个由外部主动调用 stop() 解决的 Promise
    return new Promise((resolve, reject) => {
      this._offlineResolver = resolve
      this._offlineRejecter = reject
    })
  }

  private _offlineResolver?: (res: SpeechRecognitionResult) => void
  private _offlineRejecter?: (err: any) => void

  /**
   * 云端 Web Speech API 录音流程
   */
  private async startOnlineRecognition(): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!this.onlineRecognition) {
        reject(new Error('当前浏览器不支持 Web Speech API，可切换为端侧离线模式'))
        return
      }

      this.isListening = true

      this.onlineRecognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1]
        if (result.isFinal) {
          const rawTranscript = result[0].transcript
          const confidence = result[0].confidence || 0.9
          const formatted = formatCjkText(rawTranscript)

          this.isListening = false
          resolve({
            transcript: formatted,
            confidence,
            isOffline: false
          })
        }
      }

      this.onlineRecognition.onerror = (event: any) => {
        this.isListening = false
        reject(new Error(`语音识别错误: ${event.error}`))
      }

      this.onlineRecognition.onend = () => {
        this.isListening = false
      }

      try {
        this.onlineRecognition.start()
      } catch (error) {
        this.isListening = false
        reject(new Error('启动在线语音识别失败'))
      }
    })
  }

  /**
   * 停止录音并触发转写计算
   */
  public async stop(): Promise<SpeechRecognitionResult | void> {
    if (!this.isListening) return

    if (this.engineMode === 'offline' && this.audioProcessor) {
      try {
        // 1. 停止采集并提取 16kHz PCM
        const pcm = await this.audioProcessor.stop()
        this.isListening = false

        // 2. 送入离线 ASR 调度引擎
        const asrResult = await offlineAsrEngine.transcribe(pcm)

        const finalResult: SpeechRecognitionResult = {
          transcript: asrResult.text,
          confidence: asrResult.confidence || 0.95,
          isOffline: true,
          duration: asrResult.duration,
          emotion: asrResult.emotion
        }

        if (this._offlineResolver) {
          this._offlineResolver(finalResult)
          this._offlineResolver = undefined
          this._offlineRejecter = undefined
        }

        return finalResult
      } catch (err) {
        this.isListening = false
        if (this._offlineRejecter) {
          this._offlineRejecter(err)
          this._offlineResolver = undefined
          this._offlineRejecter = undefined
        }
        throw err
      }
    } else if (this.onlineRecognition) {
      this.onlineRecognition.stop()
      this.isListening = false
    }
  }

  /**
   * 检查是否正在录音
   */
  public getIsListening(): boolean {
    return this.isListening
  }
}

/**
 * 便捷单次识别调用
 */
export async function recognizeSpeech(
  options?: SpeechRecognizerOptions
): Promise<SpeechRecognitionResult> {
  const recognizer = new SpeechRecognizer(options)
  const startPromise = recognizer.start()
  return startPromise
}
