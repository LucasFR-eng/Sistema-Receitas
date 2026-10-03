import type { FastifyInstance } from "fastify";
import { subscribeToFeed, type FeedEvent } from "../lib/feed-events.js";

// A cada 25s manda um "ping" para a conexão não ser derrubada por inatividade
const HEARTBEAT_MS = 25_000;

export async function feedRoutes(app: FastifyInstance) {
  // Server-Sent Events: o navegador abre esta conexão uma vez e o servidor
  // vai mandando avisos por ela sempre que uma receita pública muda
  app.get("/feed/events", async (request, reply) => {
    // Avisa o Fastify que esta resposta será escrita manualmente e ficará aberta
    reply.hijack();

    reply.raw.writeHead(200, {
      // Mantém os cabeçalhos de CORS que o plugin já colocou na resposta
      ...(reply.getHeaders() as Record<string, string>),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desliga o buffer de proxies como o Nginx, para os avisos chegarem na hora
      "X-Accel-Buffering": "no",
    });

    // "retry" diz ao navegador para esperar 3s antes de reconectar se a conexão cair
    reply.raw.write("retry: 3000\n\n");

    const send = (event: FeedEvent) => {
      const { type, ...data } = event;
      reply.raw.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const unsubscribe = subscribeToFeed(send);
    const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), HEARTBEAT_MS);

    // Quando o usuário fecha a aba ou sai da página, para de enviar
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
