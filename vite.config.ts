import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/sample-tracking",
  plugins: [react()],
  preview: {
   port: 8080,
   strictPort: true,
  },
  server: {
   port: 8080,
   strictPort: true,
   host: true,
   origin: "http://0.0.0.0:8080",
  },
 });