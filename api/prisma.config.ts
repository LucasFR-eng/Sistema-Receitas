import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrações precisam da conexão direta do banco. No Neon, a integração da Vercel cria
    // DATABASE_URL (com pool, usada pelo app) e DATABASE_URL_UNPOOLED (direta, usada aqui).
    url: process.env.DATABASE_URL_UNPOOLED ?? env("DATABASE_URL"),
  },
});
