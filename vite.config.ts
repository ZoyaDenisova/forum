import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { log } from 'node:console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), TanStackRouterVite({routesDirectory: './src/app/routes'})],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Проксируем запросы /api на бэкенд
      '/api': {
        target: 'http://192.168.1.46:8080/',
        changeOrigin: true,
        secure: true,
          // cookieDomainRewrite: 'localhost',
        rewrite: (path) => {
          console.log('path', path)
          return path.replace(/^\/api/, '')
        },
      
        configure: (proxy, options) => {
          console.log('!!! [VITE PROXY] Proxy middleware configured for /api !!!');

          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy Req] Sending ${req.method} request to ${options.target}${proxyReq.path}`);
            // Вы можете логировать заголовки запроса, которые Vite отправляет бэкенду
            // Object.keys(proxyReq.getHeaders()).forEach((key) => {
            //   console.log(`  Header: ${key}: ${proxyReq.getHeader(key)}`);
            // });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy Res] Received ${proxyRes.statusCode} from ${options.target}${req.url}`);
            // Вы можете логировать заголовки ответа от бэкенда
            // Object.keys(proxyRes.headers).forEach((key) => {
            //   console.log(`  Header: ${key}: ${proxyRes.headers[key]}`);
            // });
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy Error]', err);
          });
        }
      },
    },
  },
})



