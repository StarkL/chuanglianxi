/**
 * 端侧离线语音转文字引擎 (Offline ASR Engine)
 * 采用 Dedicated Web Worker 隔离架构：
 * 1. 主线程加载 ONNX 模型，通过 Transferable 传递给 Worker
 * 2. Worker 内执行：Fbank 特征提取 ➔ ONNX 推理 ➔ CTC 解码 ➔ 文本后处理
 * 3. 零网络流量、零隐私泄露、完全端侧运行
 */

import { modelManager } from './model-manager'

export interface TranscribeResult {
  text: string
  duration: number
  emotion?: string
  confidence?: number
  isModelLoaded?: boolean
}

export class OfflineAsrEngine {
  private worker: Worker | null = null
  private workerUrl: string | null = null
  private messageCounter = 0
  private pendingRequests: Map<number, { resolve: (res: any) => void; reject: (err: any) => void }> = new Map()
  private isInitialized = false
  private isModelLoaded = false

  /**
   * 初始化 Worker 线程
   */
  private async initWorker(): Promise<void> {
    if (this.worker) return

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('当前运行环境不支持 Web Worker')
    }

    // Vite Worker 加载：使用 ?worker 让 Vite 打包 Worker 为独立文件
    console.log('[ASR Engine] 开始加载 Worker...')
    // @ts-ignore - Vite 特殊导入语法，TypeScript 无法识别
    const WorkerModule = await import('./asr-worker.ts?worker')
    const WorkerCtor = WorkerModule.default
    const w = new WorkerCtor()
    this.worker = w
    console.log('[ASR Engine] Worker 实例创建成功')

    w.onmessage = (event: MessageEvent) => {
      const { id, type, result, error, args } = event.data

      // Worker 日志转发到主线程控制台
      if (type === 'LOG') {
        const level = event.data.level || 'log'
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[Worker]', ...(args || []))
        return
      }

      // Worker 致命错误
      if (type === 'FATAL') {
        console.error('[ASR Engine] Worker 致命错误:', error)
        for (const [pid, p] of this.pendingRequests.entries()) {
          p.reject(new Error(error || 'Worker 致命错误'))
          this.pendingRequests.delete(pid)
        }
        return
      }

      const pending = this.pendingRequests.get(id)
      if (!pending) return

      this.pendingRequests.delete(id)

      if (type === 'SUCCESS' || type === 'INIT_SUCCESS') {
        pending.resolve(result)
      } else {
        pending.reject(new Error(error || '转写处理异常'))
      }
    }

    w.onerror = (err: ErrorEvent) => {
      console.error('[ASR Engine] Worker 加载/运行时错误:', err.message, 'at', err.filename + ':' + err.lineno)
      for (const [pid, p] of this.pendingRequests.entries()) {
        p.reject(new Error('Worker error: ' + err.message))
        this.pendingRequests.delete(pid)
      }
    }

    this.isInitialized = true
  }

  /**
   * 加载词表文件
   */
  private async loadVocab(): Promise<string[]> {
    try {
      const response = await fetch('/crm/models/tokens.txt')
      if (!response.ok) {
        console.warn('[ASR Engine] 词表文件加载失败，使用空词表')
        return []
      }
      const text = await response.text()
      // tokens.txt 格式: "<token> <id>" 每行
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const spaceIdx = line.lastIndexOf(' ')
          return spaceIdx > 0 ? line.substring(0, spaceIdx) : line
        })
    } catch (err) {
      console.warn('[ASR Engine] 词表文件加载异常:', err)
      return []
    }
  }

  /**
   * 加载 CMVN 参数（从模型元数据提取的归一化参数）
   */
  private async loadCmvnParams(): Promise<{ negMean: number[]; invStddev: number[] }> {
    try {
      const response = await fetch('/crm/models/model-params.json')
      if (!response.ok) {
        console.warn('[ASR Engine] CMVN 参数加载失败，使用默认值')
        return { negMean: new Array(560).fill(0), invStddev: new Array(560).fill(1) }
      }
      const data = await response.json()
      return { negMean: data.negMean, invStddev: data.invStddev }
    } catch (err) {
      console.warn('[ASR Engine] CMVN 参数加载异常:', err)
      return { negMean: new Array(560).fill(0), invStddev: new Array(560).fill(1) }
    }
  }

  /**
   * 加载模型到 Worker（首次调用时执行）
   */
  private async loadModelToWorker(): Promise<void> {
    if (this.isModelLoaded) return

    await this.initWorker()

    // 从 ModelManager 获取模型 buffer
    const modelBuffer = await modelManager.loadModel()

    // 加载词表文件
    const vocab = await this.loadVocab()
    console.log(`[ASR Engine] 词表加载完成，共 ${vocab.length} 个 token`)
    if (vocab.length === 0) {
      console.error('[ASR Engine] 词表为空！检查 /crm/models/tokens.txt 是否可访问')
    }

    // 加载 CMVN 参数
    const { negMean, invStddev } = await this.loadCmvnParams()
    console.log(`[ASR Engine] CMVN 参数加载完成, negMean: ${negMean.length}, invStddev: ${invStddev.length}`)
    if (negMean.length !== 560) {
      console.error(`[ASR Engine] CMVN 参数维度错误！期望 560，实际 ${negMean.length}`)
    }

    // 将模型 buffer 通过 Transferable 传递给 Worker
    const bufferCopy = modelBuffer.slice(0)
    const initId = ++this.messageCounter
    console.log(`[ASR Engine] 发送 INIT_MODEL 到 Worker, id=${initId}, 模型大小=${bufferCopy.byteLength} bytes`)

    this.worker!.postMessage(
      {
        id: initId,
        type: 'INIT_MODEL',
        payload: {
          modelBuffer: bufferCopy,
          vocab,
          negMean,
          invStddev,
        }
      },
      [bufferCopy]
    )

    // 等待 Worker 初始化完成（带超时）
    const initPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(initId)
        reject(new Error('Worker 初始化超时 (30s)'))
      }, 30000)

      this.pendingRequests.set(initId, {
        resolve: () => {
          clearTimeout(timeout)
          this.isModelLoaded = true
          console.log('[ASR Engine] ✅ 模型加载成功，可以开始转写')
          resolve()
        },
        reject: (err) => {
          clearTimeout(timeout)
          console.error('[ASR Engine] ❌ 模型加载失败:', err)
          reject(err)
        },
      })
    })

    await initPromise
  }

  /**
   * 将 16kHz Float32Array PCM 音频转写为中文文本
   */
  public async transcribe(pcm: Float32Array): Promise<TranscribeResult> {
    const duration = pcm.length / 16000

    if (pcm.length < 1600) {
      return { text: '', duration, emotion: 'neutral', confidence: 0, isModelLoaded: this.isModelLoaded }
    }

    // 确保模型已加载
    if (!this.isModelLoaded) {
      try {
        await this.loadModelToWorker()
      } catch (err: any) {
        console.error('[ASR Engine] 模型加载失败:', err)
        return {
          text: '',
          duration,
          emotion: 'neutral',
          confidence: 0,
          isModelLoaded: false,
        }
      }
    }

    // 复制为 ArrayBuffer 用于 Transferable Zero-Copy
    const buffer = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
    const requestId = ++this.messageCounter

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.worker!.postMessage(
        {
          id: requestId,
          type: 'TRANSCRIBE',
          payload: {
            pcmBuffer: buffer,
            sampleRate: 16000,
          }
        },
        [buffer]
      )
    })
  }

  /**
   * 释放引擎与 Worker 资源
   */
  public destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl)
      this.workerUrl = null
    }
    this.pendingRequests.clear()
    this.isInitialized = false
    this.isModelLoaded = false
  }
}

export const offlineAsrEngine = new OfflineAsrEngine()
