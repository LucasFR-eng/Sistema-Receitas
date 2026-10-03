import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Por padrão o Postgres espera para sempre pela conexão; com limite, um banco fora do ar
  // vira um erro claro nos logs em vez de deixar a requisição travada
  connectionTimeoutMillis: 10_000,
});

export const prisma = new PrismaClient({ adapter });
