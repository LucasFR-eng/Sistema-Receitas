import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import { z, ZodError } from "zod";
import { env } from "./env.js";
import { Prisma } from "./generated/prisma/client.js";
import { setupAuth } from "./lib/auth.js";
import { UPLOAD_ROOT, UPLOAD_URL_PREFIX } from "./lib/storage.js";
import { authRoutes } from "./routes/auth.js";
import { AIError } from "./ai/types.js";
import { feedRoutes } from "./routes/feed.js";
import { healthRoutes } from "./routes/health.js";
import { importRoutes, MAX_IMPORT_MB } from "./routes/imports.js";
import { recipeRoutes } from "./routes/recipes.js";
import { uploadRoutes } from "./routes/uploads.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  // credentials: true permite que o navegador envie o cookie de login para a API
  // methods: por padrão o CORS só libera GET/HEAD/POST; editar (PUT) e excluir (DELETE) precisam estar na lista
  app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  });
  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: "Muitas tentativas. Aguarde um minuto e tente novamente.",
    }),
  });
  setupAuth(app);
  // Limite geral de 10 MB (PDFs da importação); a rota de fotos limita a 5 MB
  app.register(multipart, { limits: { fileSize: MAX_IMPORT_MB * 1024 * 1024, files: 1 } });
  // Serve as imagens enviadas em /uploads/nome-do-arquivo.jpg
  app.register(fastifyStatic, { root: UPLOAD_ROOT, prefix: UPLOAD_URL_PREFIX });

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

    // Falhas da IA (limite do Gemini, indisponibilidade, resposta inválida)
    if (error instanceof AIError) {
      request.log.warn({ code: error.code, cause: error.cause }, error.message);
      const status = { NOT_CONFIGURED: 503, RATE_LIMITED: 429, UNAVAILABLE: 502, INVALID_OUTPUT: 502 }[error.code];
      return reply.status(status).send({ message: error.message });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Erro interno. Tente novamente em instantes." });
  });

  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(uploadRoutes);
  app.register(recipeRoutes);
  app.register(importRoutes);
  app.register(feedRoutes);

  return app;
}
