/**
 * 端侧离线 ASR 模型生命周期与持久化缓存管理器
 * 基于 W3C 标准 CacheStorage 规范：
 * 1. 首次按需流式下载，实时上报 0% ~ 100% 进度
 * 2. 持久化存储至浏览器的独立模型沙箱 (clx-asr-models-v1)
 * 3. 离线/无网络状态下 0 秒命中，零网络流量损耗
 * 4. 支持存储配额检查与一键清空重置
 */

export type ModelStatus = 'unloaded' | 'downloading' | 'ready' | 'error'

export interface ModelProgressEvent {
  stage: 'downloading' | 'compiling' | 'ready'
  loadedBytes: number
  totalBytes: number
  percent: number
}

export type ModelProgressCallback = (event: ModelProgressEvent) => void

const CACHE_NAME = 'clx-asr-models-v1'
// 统一资源定位，生产环境可指向本地 /crm/models/，或自托管 CDN
export const DEFAULT_MODEL_URL = '/crm/models/sensevoice_small_int8.onnx'
export const ESTIMATED_MODEL_SIZE = 112 * 1024 * 1024 // ~112MB

class AsrModelManager {
  private status: ModelStatus = 'unloaded'
  private cachedBuffer: ArrayBuffer | null = null
  private listeners: Set<(status: ModelStatus) => void> = new Set()

  /**
   * 检查浏览器是否支持 CacheStorage
   */
  public isCacheSupported(): boolean {
    return typeof window !== 'undefined' && 'caches' in window
  }

  /**
   * 获取当前模型就绪状态
   */
  public getStatus(): ModelStatus {
    return this.status
  }

  /**
   * 监听模型状态变更
   */
  public onStatusChange(callback: (status: ModelStatus) => void): () => void {
    this.listeners.add(callback)
    callback(this.status)
    return () => this.listeners.delete(callback)
  }

  private setStatus(newStatus: ModelStatus) {
    this.status = newStatus
    for (const listener of this.listeners) {
      listener(newStatus)
    }
  }

  /**
   * 检查模型是否已离线持久化 (严格校验二进制大小与非 HTML)
   */
  public async isModelCached(modelUrl: string = DEFAULT_MODEL_URL): Promise<boolean> {
    if (!this.isCacheSupported()) return false
    try {
      const cache = await caches.open(CACHE_NAME)
      const matched = await cache.match(modelUrl)
      if (!matched) return false

      const contentType = matched.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        await cache.delete(modelUrl)
        return false
      }

      const blob = await matched.blob()
      // 真实 SenseVoice INT8 模型约为 112MB，若低于 10MB 显然是无效文件或 404 回退页
      if (blob.size < 10 * 1024 * 1024) {
        await cache.delete(modelUrl)
        return false
      }
      return true
    } catch (e) {
      console.warn('检查 CacheStorage 失败:', e)
      return false
    }
  }

  /**
   * 获取已缓存模型大小（字节）
   */
  public async getCachedSize(modelUrl: string = DEFAULT_MODEL_URL): Promise<number> {
    if (!this.isCacheSupported()) return 0
    try {
      const cache = await caches.open(CACHE_NAME)
      const res = await cache.match(modelUrl)
      if (!res) return 0
      const blob = await res.blob()
      return blob.size
    } catch {
      return 0
    }
  }

  /**
   * 加载或下载离线模型
   * 若 CacheStorage 已命中，直接读取，不走任何网络；
   * 若未命中，流式下载并实时通知进度。
   */
  public async loadModel(
    modelUrl: string = DEFAULT_MODEL_URL,
    onProgress?: ModelProgressCallback
  ): Promise<ArrayBuffer> {
    if (this.cachedBuffer) {
      this.setStatus('ready')
      if (onProgress) {
        onProgress({
          stage: 'ready',
          loadedBytes: this.cachedBuffer.byteLength,
          totalBytes: this.cachedBuffer.byteLength,
          percent: 100
        })
      }
      return this.cachedBuffer
    }

    // 1. 优先尝试从本地 CacheStorage 读取
    if (this.isCacheSupported()) {
      try {
        const cache = await caches.open(CACHE_NAME)
        const cachedRes = await cache.match(modelUrl)
        if (cachedRes) {
          this.setStatus('downloading')
          if (onProgress) {
            onProgress({
              stage: 'compiling',
              loadedBytes: ESTIMATED_MODEL_SIZE,
              totalBytes: ESTIMATED_MODEL_SIZE,
              percent: 95
            })
          }
          const buf = await cachedRes.arrayBuffer()
          this.cachedBuffer = buf
          this.setStatus('ready')
          if (onProgress) {
            onProgress({
              stage: 'ready',
              loadedBytes: buf.byteLength,
              totalBytes: buf.byteLength,
              percent: 100
            })
          }
          return buf
        }
      } catch (e) {
        console.warn('读取本地缓存模型异常，转为网络拉取:', e)
      }
    }

    // 2. 本地无缓存，发起流式下载
    this.setStatus('downloading')

    try {
      const response = await fetch(modelUrl)
      if (!response.ok && response.status !== 200) {
        throw new Error(`下载模型文件失败 (HTTP ${response.status})`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        throw new Error('未找到离线模型权重文件，建议使用【原生极速模式】以获得最佳体验')
      }

      const contentLengthHeader = response.headers.get('content-length')
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : ESTIMATED_MODEL_SIZE
      let loadedBytes = 0

      const reader = response.body?.getReader()
      if (!reader) {
        const buf = await response.arrayBuffer()
        this.cachedBuffer = buf
        if (this.isCacheSupported()) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(modelUrl, new Response(buf))
        }
        this.setStatus('ready')
        return buf
      }

      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          loadedBytes += value.length
          const percent = Math.min(99, Math.round((loadedBytes / totalBytes) * 100))
          if (onProgress) {
            onProgress({
              stage: 'downloading',
              loadedBytes,
              totalBytes,
              percent
            })
          }
        }
      }

      // 合并 chunks
      const combined = new Uint8Array(loadedBytes)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      const buffer = combined.buffer

      // 写入持久化 CacheStorage
      if (this.isCacheSupported()) {
        try {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(modelUrl, new Response(buffer))
        } catch (e) {
          console.warn('写入 CacheStorage 失败:', e)
        }
      }

      this.cachedBuffer = buffer
      this.setStatus('ready')

      if (onProgress) {
        onProgress({
          stage: 'ready',
          loadedBytes,
          totalBytes: loadedBytes,
          percent: 100
        })
      }

      return buffer
    } catch (err: any) {
      this.setStatus('error')
      console.error('加载离线 ASR 模型失败:', err)
      throw err
    }
  }

  /**
   * 清除本地已缓存的模型文件，释放存储空间
   */
  public async clearCache(modelUrl: string = DEFAULT_MODEL_URL): Promise<boolean> {
    this.cachedBuffer = null
    this.setStatus('unloaded')
    if (!this.isCacheSupported()) return true
    try {
      const cache = await caches.open(CACHE_NAME)
      return await cache.delete(modelUrl)
    } catch {
      return false
    }
  }
}

export const modelManager = new AsrModelManager()
