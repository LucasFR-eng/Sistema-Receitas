import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

// Rota para verificar se a API e o banco estão funcionando.
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "ok" };
    } catch {
      return reply.status(503).send({ status: "error", database: "down" });
    }
  });
}
