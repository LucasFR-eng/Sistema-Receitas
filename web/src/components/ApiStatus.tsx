import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.ts";

type Status = "checking" | "ok" | "db-down" | "offline";

const labels: Record<Status, { text: string; color: string }> = {
  checking: { text: "Verificando API…", color: "bg-stone-400" },
  ok: { text: "API e banco online", color: "bg-green-500" },
  "db-down": { text: "API online, banco fora do ar", color: "bg-amber-500" },
  offline: { text: "API offline", color: "bg-red-500" },
};

// Indicador temporário para conferir se front, API e banco estão conversando.
export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    apiGet<{ database: string }>("/health")
      .then((data) => setStatus(data.database === "ok" ? "ok" : "db-down"))
      .catch((error: unknown) => {
        setStatus(error instanceof Error && error.message.includes("503") ? "db-down" : "offline");
      });
  }, []);

  const { text, color } = labels[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200">
      <span className={`size-2 rounded-full ${color}`} />
      {text}
    </span>
  );
}
