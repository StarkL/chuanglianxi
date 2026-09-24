/**
 * 模型文件下载路由
 * 模型文件预先放在后端服务器的 models/ 目录，前端从后端拉取
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'

// 模型文件存储目录（后端服务器本地）
const MODEL_DIR = join(process.cwd(), 'models')
const MODEL_FILENAME = 'sensevoice_small_int8.onnx'
const MODEL_PATH = join(MODEL_DIR, MODEL_FILENAME)

export async function modelRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/models/asr
   * 返回 ASR 模型文件（流式传输）
   */
  fastify.get('/models/asr', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!existsSync(MODEL_PATH)) {
      reply.code(404)
      return { error: '模型文件未部署，请联系管理员放置 sensevoice_small_int8.onnx 到 models/ 目录' }
    }

    const stat = await import('fs/promises').then(fs => fs.stat(MODEL_PATH))
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Length', stat.size)
    reply.header('Accept-Ranges', 'bytes')
    reply.header('Cache-Control', 'public, max-age=31536000')
    return reply.send(createReadStream(MODEL_PATH))
  })

  /**
   * GET /api/models/asr/progress
   * 查询模型是否已部署
   */
  fastify.get('/models/asr/progress', async () => {
    if (existsSync(MODEL_PATH)) {
      const stat = await import('fs/promises').then(fs => fs.stat(MODEL_PATH))
      return {
        status: 'ready',
        size: stat.size,
        percent: 100,
      }
    }
    return { status: 'not_deployed', size: 0, percent: 0 }
  })
}
