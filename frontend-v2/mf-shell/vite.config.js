import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host-app',
      remotes: {
        // mfCarte supprimé pour utiliser la carte locale
      },
      shared: ['react', 'react-dom']
    })
  ],
  server: {
    port: 3005, host: "0.0.0.0",
    strictPort: true,
    proxy: {
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
  }
})
