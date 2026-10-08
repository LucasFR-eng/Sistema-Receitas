import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Identifica cada deploy: na Vercel, o commit publicado; fora dela, a hora do build.
// O app guarda o seu e compara com o de /version.json para avisar quando sai versão nova
// (o site não tem os tipos do Node instalados, por isso o process é lido pelo globalThis)
const buildEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const BUILD_ID = buildEnv.VERCEL_GIT_COMMIT_SHA || String(Date.now());

function versionFile(): Plugin {
  return {
    name: "version-file",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ buildId: BUILD_ID }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
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
