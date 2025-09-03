import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    host: '0.0.0.0', // Allow external access
    strictPort: true,
    allowedHosts: ['test.complianceone.ai', 'newtest.complianceone.ai', "c234422adcbb.ngrok-free.app"],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
  }
});