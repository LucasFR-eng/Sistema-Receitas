import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

// Rota para verificar se a API e o banco estão funcionando.
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "ok" };
    } catch (error) {
      // Registra o motivo nos logs (na Vercel: aba Logs) para facilitar a investigação
      request.log.error({ err: error }, "Falha ao acessar o banco de dados");
      return reply.status(503).send({ status: "error", database: "down" });
    }
  });
}
