import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfCarte',
      filename: 'remoteEntry.js',
      exposes: {
        './MapComponent': './src/MapComponent.jsx',
      },
      shared: ['react', 'react-dom']
    })
  ],
  server: {
    port: 3001,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    modulePreload: false,
    minify: false,
    cssCodeSplit: false
  },
  preview: {
    port: 3001,
    strictPort: true,
  }
})
