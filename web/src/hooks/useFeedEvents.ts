import type { RecipeSummary } from "../types.ts";
import { useServerEvents } from "./useServerEvents.ts";

export type FeedEvent =
  | { type: "recipe:published"; recipe: RecipeSummary }
  | { type: "recipe:updated"; recipe: RecipeSummary }
  | { type: "recipe:removed"; id: string };

const FEED_EVENT_TYPES: FeedEvent["type"][] = ["recipe:published", "recipe:updated", "recipe:removed"];

// Avisos do feed público em tempo real. Devolve true enquanto a conexão está ativa.
export function useFeedEvents(options: { onEvent: (event: FeedEvent) => void; onReconnect?: () => void }) {
  return useServerEvents<FeedEvent>("/feed/events", { types: FEED_EVENT_TYPES, ...options });
}
