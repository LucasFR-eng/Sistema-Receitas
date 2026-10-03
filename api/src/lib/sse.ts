import type { FastifyReply, FastifyRequest } from "fastify";

// A cada 25s manda um "ping" para a conexão não ser derrubada por inatividade
const HEARTBEAT_MS = 25_000;

export interface ServerEvent {
  type: string;
  [key: string]: unknown;
}

// Abre uma conexão Server-Sent Events: fica aberta e repassa ao navegador cada evento recebido.
// `subscribe` recebe a função que envia os eventos e devolve a função que cancela a inscrição.
export function openEventStream(
  request: FastifyRequest,
  reply: FastifyReply,
  subscribe: (send: (event: ServerEvent) => void) => () => void,
) {
  // Avisa o Fastify que esta resposta será escrita manualmente e ficará aberta
  reply.hijack();

  reply.raw.writeHead(200, {
    // Mantém os cabeçalhos de CORS que o plugin já colocou na resposta
    ...(reply.getHeaders() as Record<string, string>),
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Desliga o buffer de proxies como o Nginx, para os eventos chegarem na hora
    "X-Accel-Buffering": "no",
  });

  // "retry" diz ao navegador para esperar 3s antes de reconectar se a conexão cair
  reply.raw.write("retry: 3000\n\n");

  const unsubscribe = subscribe(({ type, ...data }) => {
    reply.raw.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  });
  const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), HEARTBEAT_MS);

  // Quando o usuário fecha a aba ou sai da página, para de enviar
  request.raw.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
