// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ВАЖНО: здесь имя репозитория на GitHub, например /vmm/ или /music-app/
  base: '/vmm/', 
})
