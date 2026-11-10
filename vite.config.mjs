import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

/**
 * The local API middleware is only needed while serving (`vite`/`vite preview`).
 * Builds must not import the Windows modules: Vercel has no netsh/sqlite here.
 */
async function localApi() {
  const { handleApi } = await import('./server/api.mjs')
  const mount = (server) => {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api/')) {
        next()
        return
      }
      handleApi(req, res)
        .then((handled) => {
          if (!handled) next()
        })
        .catch(next)
    })
  }

  return {
    name: 'arhlinx-local-api',
    configureServer: mount,
    configurePreviewServer: mount
  }
}

export default defineConfig(async ({ command }) => ({
  root: resolve('src/renderer'),
  envDir: resolve('.'),
  plugins: [react(), tailwindcss(), ...(command === 'serve' ? [await localApi()] : [])],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true
  }
}))
