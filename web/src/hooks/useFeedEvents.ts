import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api.ts";
import type { RecipeSummary } from "../types.ts";

export type FeedEvent =
  | { type: "recipe:published"; recipe: RecipeSummary }
  | { type: "recipe:updated"; recipe: RecipeSummary }
  | { type: "recipe:removed"; id: string };

const EVENT_TYPES: FeedEvent["type"][] = ["recipe:published", "recipe:updated", "recipe:removed"];

interface Options {
  onEvent: (event: FeedEvent) => void;
  // Chamado quando a conexão volta depois de cair (pode ter perdido avisos no meio)
  onReconnect?: () => void;
}

// Mantém uma conexão aberta com a API (Server-Sent Events) e repassa os avisos do feed.
// Devolve true enquanto a conexão está ativa.
export function useFeedEvents({ onEvent, onReconnect }: Options): boolean {
  const [connected, setConnected] = useState(false);
  // Guarda sempre a versão mais nova das funções, sem precisar reabrir a conexão
  const handlers = useRef({ onEvent, onReconnect });
  useEffect(() => {
    handlers.current = { onEvent, onReconnect };
  });

  useEffect(() => {
    // O EventSource reconecta sozinho se a conexão cair
    const source = new EventSource(`${API_URL}/feed/events`);
    let lostConnection = false;

    source.onopen = () => {
      setConnected(true);
      if (lostConnection) handlers.current.onReconnect?.();
      lostConnection = false;
    };
    source.onerror = () => {
      setConnected(false);
      lostConnection = true;
    };

    for (const type of EVENT_TYPES) {
      source.addEventListener(type, (message) => {
        const data = JSON.parse((message as MessageEvent<string>).data);
        handlers.current.onEvent({ type, ...data } as FeedEvent);
      });
    }

    return () => source.close();
  }, []);

  return connected;
}
