import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: env.WEB_ORIGIN });
  app.register(healthRoutes);

  return app;
}
