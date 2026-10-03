import { Redis } from "ioredis";
import { EventEmitter } from "node:events";
import { env } from "../env.js";

// Avisos enviados em tempo real para quem está com o feed aberto
export type FeedEvent =
  | { type: "recipe:published"; recipe: unknown }
  | { type: "recipe:updated"; recipe: unknown }
  | { type: "recipe:removed"; id: string };

// Avisos de uma receita específica, para quem está com a página dela aberta
export type RecipeEvent = { type: "comment:created"; comment: unknown } | { type: "comment:deleted"; id: string };

type AnyEvent = FeedEvent | RecipeEvent;

const FEED_CHANNEL = "feed";
const recipeChannel = (recipeId: string) => `recipe:${recipeId}`;

// Entrega local: cada navegador conectado a esta cópia da API é um "ouvinte"
const local = new EventEmitter();
local.setMaxListeners(0);

// Na Vercel a API pode rodar em várias cópias ao mesmo tempo. O Redis (pub/sub) leva cada aviso
// a todas elas. Sem REDIS_URL (desenvolvimento), os avisos ficam só na memória desta cópia.
const redisUrl = env.REDIS_URL ?? env.KV_URL;
const publisher = redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;
// Assinar canais trava a conexão para outros comandos, por isso uma conexão separada
const subscriber = redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;

subscriber?.on("message", (channel: string, message: string) => {
  local.emit(channel, JSON.parse(message));
});

function publish(channel: string, event: AnyEvent) {
  if (publisher) {
    publisher.publish(channel, JSON.stringify(event)).catch((error) => {
      console.error("Falha ao publicar aviso no Redis", error);
    });
  } else {
    local.emit(channel, event);
  }
}

function subscribe<T extends AnyEvent>(channel: string, listener: (event: T) => void): () => void {
  local.on(channel, listener);
  // Assina o canal no Redis só quando chega o primeiro ouvinte desta cópia
  if (subscriber && local.listenerCount(channel) === 1) {
    subscriber.subscribe(channel).catch((error) => console.error("Falha ao assinar canal no Redis", error));
  }

  return () => {
    local.off(channel, listener);
    // E cancela quando o último ouvinte sai
    if (subscriber && local.listenerCount(channel) === 0) {
      subscriber.unsubscribe(channel).catch(() => {});
    }
  };
}

export function publishFeedEvent(event: FeedEvent) {
  publish(FEED_CHANNEL, event);
}

export function subscribeToFeed(listener: (event: FeedEvent) => void): () => void {
  return subscribe(FEED_CHANNEL, listener);
}

export function publishRecipeEvent(recipeId: string, event: RecipeEvent) {
  publish(recipeChannel(recipeId), event);
}

export function subscribeToRecipe(recipeId: string, listener: (event: RecipeEvent) => void): () => void {
  return subscribe(recipeChannel(recipeId), listener);
}
