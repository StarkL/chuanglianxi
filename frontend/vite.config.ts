import { defineConfig } from 'vite'
// @ts-ignore - vite-plugin-uni uses non-standard ESM/CJS interop
import _uni from '@dcloudio/vite-plugin-uni'
const uni = (_uni as any).default || _uni
import { resolve } from 'path'

export default defineConfig({
  plugins: [uni()],
  base: '/crm/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
