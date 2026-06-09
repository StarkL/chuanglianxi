/**
 * H5 语音识别工具
 * 使用 Web Speech API 实现语音转文字
 */

interface SpeechRecognitionResult {
  transcript: string
  confidence: number
}

interface SpeechRecognizerOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
}

export class SpeechRecognizer {
  private recognition: any = null
  private isListening = false
  private options: Required<SpeechRecognizerOptions>

  constructor(options: SpeechRecognizerOptions = {}) {
    this.options = {
      language: options.language || 'zh-CN',
      continuous: options.continuous || false,
      interimResults: options.interimResults || false,
      maxAlternatives: options.maxAlternatives || 1,
    }

    // 检查浏览器支持
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn('当前浏览器不支持 Web Speech API')
      return
    }

    this.recognition = new SpeechRecognitionAPI()
    this.recognition.lang = this.options.language
    this.recognition.continuous = this.options.continuous
    this.recognition.interimResults = this.options.interimResults
    this.recognition.maxAlternatives = this.options.maxAlternatives
  }

  /**
   * 检查是否支持语音识别
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    )
  }

  /**
   * 开始录音
   */
  start(): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('语音识别未初始化，浏览器可能不支持'))
        return
      }

      if (this.isListening) {
        reject(new Error('正在录音中'))
        return
      }

      this.isListening = true

      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1]

        if (result.isFinal) {
          const transcript = result[0].transcript
          const confidence = result[0].confidence

          resolve({
            transcript,
            confidence: confidence || 0,
          })

          this.isListening = false
        }
      }

      this.recognition.onerror = (event: any) => {
        this.isListening = false
        reject(new Error(`语音识别错误: ${event.error}`))
      }

      this.recognition.onend = () => {
        this.isListening = false
      }

      try {
        this.recognition.start()
      } catch (error) {
        this.isListening = false
        reject(new Error('启动语音识别失败'))
      }
    })
  }

  /**
   * 停止录音
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  /**
   * 检查是否正在录音
   */
  getIsListening(): boolean {
    return this.isListening
  }
}

/**
 * 一次性语音识别函数
 */
export async function recognizeSpeech(
  options?: SpeechRecognizerOptions
): Promise<SpeechRecognitionResult> {
  const recognizer = new SpeechRecognizer(options)
  return recognizer.start()
}
