import { EventEmitter } from "node:events";

// Avisos enviados em tempo real para quem está com o feed aberto
export type FeedEvent =
  | { type: "recipe:published"; recipe: unknown }
  | { type: "recipe:updated"; recipe: unknown }
  | { type: "recipe:removed"; id: string };

// Avisos de uma receita específica, para quem está com a página dela aberta
export type RecipeEvent = { type: "comment:created"; comment: unknown } | { type: "comment:deleted"; id: string };

// Central de avisos em memória. Funciona com um único servidor da API;
// se um dia rodarem várias cópias da API, troque por um pub/sub compartilhado (ex: Redis).
const emitter = new EventEmitter();
// Cada navegador conectado é um "ouvinte"; o padrão do Node avisa a partir de 10
emitter.setMaxListeners(0);

export function publishFeedEvent(event: FeedEvent) {
  emitter.emit("feed", event);
}

export function subscribeToFeed(listener: (event: FeedEvent) => void): () => void {
  emitter.on("feed", listener);
  return () => emitter.off("feed", listener);
}

export function publishRecipeEvent(recipeId: string, event: RecipeEvent) {
  emitter.emit(`recipe:${recipeId}`, event);
}

export function subscribeToRecipe(recipeId: string, listener: (event: RecipeEvent) => void): () => void {
  emitter.on(`recipe:${recipeId}`, listener);
  return () => emitter.off(`recipe:${recipeId}`, listener);
}
