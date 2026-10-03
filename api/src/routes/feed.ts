import type { FastifyInstance } from "fastify";
import { subscribeToFeed } from "../lib/feed-events.js";
import { openEventStream } from "../lib/sse.js";

export async function feedRoutes(app: FastifyInstance) {
  // Server-Sent Events: o navegador abre esta conexão uma vez e o servidor
  // vai mandando avisos por ela sempre que uma receita pública muda
  app.get("/feed/events", async (request, reply) => {
    openEventStream(request, reply, subscribeToFeed);
  });
}
