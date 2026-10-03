import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api.ts";

interface Options<T> {
  // Tipos de evento que interessam (ex: "comment:created")
  types: string[];
  onEvent: (event: T) => void;
  // Chamado quando a conexão volta depois de cair (pode ter perdido eventos no meio)
  onReconnect?: () => void;
}

// Mantém uma conexão Server-Sent Events aberta com a API e repassa os eventos recebidos.
// Devolve true enquanto a conexão está ativa.
export function useServerEvents<T extends { type: string }>(path: string, { types, onEvent, onReconnect }: Options<T>) {
  const [connected, setConnected] = useState(false);
  // Guarda sempre a versão mais nova das funções, sem precisar reabrir a conexão
  const handlers = useRef({ onEvent, onReconnect });
  useEffect(() => {
    handlers.current = { onEvent, onReconnect };
  });

  const typesKey = types.join(",");

  useEffect(() => {
    // withCredentials envia o cookie de login (necessário para o dono ver eventos de receita privada).
    // O EventSource reconecta sozinho se a conexão cair.
    const source = new EventSource(`${API_URL}${path}`, { withCredentials: true });
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

    for (const type of typesKey.split(",")) {
      source.addEventListener(type, (message) => {
        const data = JSON.parse((message as MessageEvent<string>).data);
        handlers.current.onEvent({ type, ...data } as T);
      });
    }

    return () => source.close();
  }, [path, typesKey]);

  return connected;
}
