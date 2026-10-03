import { EventEmitter } from "node:events";

// Avisos enviados em tempo real para quem está com o feed aberto
export type FeedEvent =
  | { type: "recipe:published"; recipe: unknown }
  | { type: "recipe:updated"; recipe: unknown }
  | { type: "recipe:removed"; id: string };

// Central de avisos em memória. Funciona com um único servidor da API;
// se um dia rodarem várias cópias da API, troque por um pub/sub compartilhado (ex: Redis).
const emitter = new EventEmitter();
// Cada navegador conectado é um "ouvinte"; o padrão do Node avisa a partir de 10
emitter.setMaxListeners(0);

export function publishFeedEvent(event: FeedEvent) {
  emitter.emit("event", event);
}

export function subscribeToFeed(listener: (event: FeedEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}
