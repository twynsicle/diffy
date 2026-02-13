import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    build: { sourcemap: false },
    plugins: [externalizeDepsPlugin({ exclude: ['chokidar'] })],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared'),
      },
    },
  },
  preload: {
    build: { sourcemap: false },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    build: { sourcemap: false },
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
      },
    },
  },
})
