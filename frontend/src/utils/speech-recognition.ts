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
  isModelLoaded?: boolean
  duration?: number
  emotion?: string
}

export interface SpeechRecognizerOptions {
  engineMode?: SpeechEngineMode     // 识别引擎模式，默认 'online' (原生流式优先)
  language?: string                 // 语言，默认 'zh-CN'
  continuous?: boolean              // 是否连续识别
  interimResults?: boolean          // 是否输出临时结果
  maxAlternatives?: number          // 最大候选数
  onVolume?: (level: number) => void // 实时音量回调 (0 ~ 100)
  onInterim?: (text: string) => void // 实时流式文字转写回调 (边说边显字)
}

export class SpeechRecognizer {
  private engineMode: SpeechEngineMode = 'online'
  private audioProcessor: AudioProcessor | null = null
  private onlineRecognition: any = null
  private isListening = false
  private accumulatedFinalText = ''
  private currentInterimText = ''
  private _offlineResolver?: (res: SpeechRecognitionResult) => void
  private _offlineRejecter?: (err: any) => void
  private options: Required<Omit<SpeechRecognizerOptions, 'onVolume' | 'onInterim'>> & {
    onVolume?: (level: number) => void
    onInterim?: (text: string) => void
  }

  constructor(options: SpeechRecognizerOptions = {}) {
    this.engineMode = options.engineMode || (SpeechRecognizer.isOnlineSupported() ? 'online' : 'offline')
    this.options = {
      engineMode: this.engineMode,
      language: options.language || 'zh-CN',
      continuous: options.continuous ?? true,
      interimResults: options.interimResults ?? true,
      maxAlternatives: options.maxAlternatives || 1,
      onVolume: options.onVolume,
      onInterim: options.onInterim
    }
  }

  /**
   * 检查当前浏览器是否支持端侧录音与本地 ASR
   */
  static isOfflineSupported(): boolean {
    return AudioProcessor.isSupported()
  }

  /**
   * 检查当前浏览器是否支持原生 Web Speech API
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
  public async start(): Promise<void> {
    if (this.isListening) {
      throw new Error('正在录音中')
    }

    this.isListening = true
    this.accumulatedFinalText = ''
    this.currentInterimText = ''

    // 无论在线还是离线模式，都启动 AudioProcessor 以驱动实时声波动画 (RMS 音量)
    if (AudioProcessor.isSupported()) {
      try {
        this.audioProcessor = new AudioProcessor({
          sampleRate: 16000,
          onVolume: this.options.onVolume
        })
        await this.audioProcessor.start()
      } catch (err) {
        console.warn('启动音量监控 AudioProcessor 失败:', err)
      }
    }

    if (this.engineMode === 'online' && SpeechRecognizer.isOnlineSupported()) {
      await this.startOnlineRecognition()
    } else {
      await this.startOfflineRecognition()
    }
  }

  /**
   * 端侧离线录音流程准备
   */
  private async startOfflineRecognition(): Promise<void> {
    // 基础采集已由 AudioProcessor 处理，等待调用 stop() 提交 Worker 推理
  }

  /**
   * 原生 Web Speech API 实时流式录音识别流程
   */
  private async startOnlineRecognition(): Promise<void> {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn('当前浏览器未搭载 Web Speech API，降级至离线模式')
      this.engineMode = 'offline'
      return
    }

    try {
      this.onlineRecognition = new SpeechRecognitionAPI()
      this.onlineRecognition.lang = this.options.language
      this.onlineRecognition.continuous = true
      this.onlineRecognition.interimResults = true
      this.onlineRecognition.maxAlternatives = this.options.maxAlternatives

      this.onlineRecognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            this.accumulatedFinalText += item[0].transcript
          } else {
            interim += item[0].transcript
          }
        }
        this.currentInterimText = interim
        const currentTotal = (this.accumulatedFinalText + this.currentInterimText).trim()

        if (this.options.onInterim) {
          this.options.onInterim(currentTotal)
        }
      }

      this.onlineRecognition.onerror = (event: any) => {
        console.warn('Web Speech API 事件异常:', event.error)
      }

      this.onlineRecognition.onend = () => {
        // 若外部仍在录音状态且发生正常切片结束，自动保持重启
        if (this.isListening && this.onlineRecognition) {
          try {
            this.onlineRecognition.start()
          } catch {}
        }
      }

      this.onlineRecognition.start()
    } catch (error) {
      console.warn('启动 Web Speech 识别引擎失败，降级为离线模式:', error)
      this.engineMode = 'offline'
    }
  }

  /**
   * 停止录音并返回整合后的文本转写结果
   */
  public async stop(): Promise<SpeechRecognitionResult> {
    if (!this.isListening) {
      return {
        transcript: formatCjkText(this.accumulatedFinalText || this.currentInterimText),
        confidence: 0.9
      }
    }

    this.isListening = false

    // 1. 停止音频采样与音量计量
    let pcm: Float32Array | null = null
    if (this.audioProcessor) {
      try {
        pcm = await this.audioProcessor.stop()
      } catch (e) {
        console.warn('停止 AudioProcessor 发生异常:', e)
      }
      this.audioProcessor = null
    }

    // 2. 原生在线模式处理
    if (this.engineMode === 'online') {
      if (this.onlineRecognition) {
        try {
          this.onlineRecognition.stop()
        } catch {}
        this.onlineRecognition = null
      }

      let combined = (this.accumulatedFinalText + this.currentInterimText).trim()
      combined = formatCjkText(combined)

      const result: SpeechRecognitionResult = {
        transcript: combined,
        confidence: 0.95,
        isOffline: false
      }

      if (this._offlineResolver) {
        this._offlineResolver(result)
        this._offlineResolver = undefined
        this._offlineRejecter = undefined
      }

      return result
    }

    // 3. 离线模式处理
    if (this.engineMode === 'offline' && pcm) {
      try {
        const asrResult = await offlineAsrEngine.transcribe(pcm)
        let text = asrResult.text
        if (!text && (this.accumulatedFinalText || this.currentInterimText)) {
          text = (this.accumulatedFinalText + this.currentInterimText).trim()
        }

        const result: SpeechRecognitionResult = {
          transcript: formatCjkText(text),
          confidence: asrResult.confidence || 0.92,
          isOffline: true,
          isModelLoaded: asrResult.isModelLoaded !== false,
          duration: asrResult.duration,
          emotion: asrResult.emotion
        }

        if (this._offlineResolver) {
          this._offlineResolver(result)
          this._offlineResolver = undefined
          this._offlineRejecter = undefined
        }

        return result
      } catch (err) {
        if (this._offlineRejecter) {
          this._offlineRejecter(err)
          this._offlineResolver = undefined
          this._offlineRejecter = undefined
        }
        throw err
      }
    }

    const fallbackResult: SpeechRecognitionResult = {
      transcript: formatCjkText(this.accumulatedFinalText || this.currentInterimText),
      confidence: 0.9
    }
    return fallbackResult
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
  await recognizer.start()
  return recognizer.stop()
}
