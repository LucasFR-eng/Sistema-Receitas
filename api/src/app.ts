import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { z, ZodError } from "zod";
import { env } from "./env.js";
import { Prisma } from "./generated/prisma/client.js";
import { setupAuth } from "./lib/auth.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  // credentials: true permite que o navegador envie o cookie de login para a API
  app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: "Muitas tentativas. Aguarde um minuto e tente novamente.",
    }),
  });
  setupAuth(app);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Dados enviados não passaram na validação do zod
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Confira os campos destacados",
        fieldErrors: z.flattenError(error).fieldErrors,
      });
    }

    // Violação de campo único no banco (ex: dois cadastros simultâneos com o mesmo e-mail)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.status(409).send({ message: "Esse registro já existe" });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Erro interno. Tente novamente em instantes." });
  });

  app.register(healthRoutes);
  app.register(authRoutes);

  return app;
}
