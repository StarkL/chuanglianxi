/**
 * 模型文件下载路由
 * 模型文件预先放在后端服务器的 models/ 目录，前端从后端拉取
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'

// 模型文件存储目录（后端服务器本地）
const MODEL_FILENAME = 'sensevoice_small_int8.onnx'

function resolveModelPath(): string {
  const candidates = [
    join(process.cwd(), 'models', MODEL_FILENAME),
    join(process.cwd(), 'backend', 'models', MODEL_FILENAME),
    join(process.cwd(), 'chuanglianxi', 'backend', 'models', MODEL_FILENAME),
    '/home/admin/chuanglianxi/backend/models/sensevoice_small_int8.onnx',
    '/usr/share/nginx/html/crm/models/sensevoice_small_int8.onnx',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return join(process.cwd(), 'models', MODEL_FILENAME)
}

export async function modelRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/models/asr
   * 返回 ASR 模型文件（流式传输）
   */
  fastify.get('/models/asr', async (request: FastifyRequest, reply: FastifyReply) => {
    const modelPath = resolveModelPath()
    if (!existsSync(modelPath)) {
      reply.code(404)
      return { error: '模型文件未部署，请联系管理员放置 sensevoice_small_int8.onnx 到 models/ 目录' }
    }

    const stat = await import('fs/promises').then(fs => fs.stat(modelPath))
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Length', stat.size)
    reply.header('Accept-Ranges', 'bytes')
    reply.header('Cache-Control', 'public, max-age=31536000')
    return reply.send(createReadStream(modelPath))
  })

  /**
   * GET /api/models/asr/progress
   * 查询模型是否已部署
   */
  fastify.get('/models/asr/progress', async () => {
    const modelPath = resolveModelPath()
    if (existsSync(modelPath)) {
      const stat = await import('fs/promises').then(fs => fs.stat(modelPath))
      return {
        status: 'ready',
        size: stat.size,
        percent: 100,
      }
    }
    return { status: 'not_deployed', size: 0, percent: 0 }
  })
}
