import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrações não funcionam pelo pool em modo transação. No Supabase, DATABASE_URL é o
    // Transaction pooler (usado pelo app) e DATABASE_URL_UNPOOLED o Session pooler (usado aqui).
    url: process.env.DATABASE_URL_UNPOOLED ?? env("DATABASE_URL"),
  },
});
