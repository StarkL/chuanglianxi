import { defineConfig } from 'vite'
// @ts-ignore - vite-plugin-uni uses non-standard ESM/CJS interop
import _uni from '@dcloudio/vite-plugin-uni'
const uni = (_uni as any).default || _uni
import fs from 'fs'
import { resolve } from 'path'

function pwaPlugin() {
  return {
    name: 'vite-pwa-static-middleware',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const rawUrl = req.url?.split('?')[0] || ''
        const url = rawUrl.replace(/^\/crm/, '')
        if (url === '/manifest.webmanifest') {
          const filePath = resolve(__dirname, 'public/manifest.webmanifest')
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        if (url === '/sw.js') {
          const filePath = resolve(__dirname, 'public/sw.js')
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.setHeader('Service-Worker-Allowed', '/crm/')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        if (url === '/icon.svg') {
          const filePath = resolve(__dirname, 'public/icon.svg')
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'image/svg+xml')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        if (url === '/icon-192.png' || url === '/icon-512.png' || url === '/apple-touch-icon.png') {
          const filePath = resolve(__dirname, `public${url}`)
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'image/png')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [pwaPlugin(), uni()],
  base: '/crm/',
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/crm/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/crm\/api/, '/api')
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
