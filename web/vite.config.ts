import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // /api/... vai para a API em localhost:3333 (igual à Vercel, onde site e API dividem o endereço)
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
      },
    },
  },
});
