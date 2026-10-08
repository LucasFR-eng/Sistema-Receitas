import { useEffect, useState } from "react";

// Enquanto o app fica aberto, confere de tempos em tempos se saiu um deploy novo
const CHECK_EVERY_MS = 5 * 60 * 1000;

async function publishedBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { buildId?: unknown };
    return typeof data.buildId === "string" ? data.buildId : null;
  } catch {
    // Sem internet ou erro passageiro: tenta de novo na próxima conferência
    return null;
  }
}

// Aviso de versão nova para quem deixou o app aberto (principalmente o app instalado, que fica
// em segundo plano): confere ao voltar para o app e a cada 5 minutos, e recarrega com um toque.
export function UpdateBanner() {
  const [status, setStatus] = useState<"current" | "available" | "dismissed">("current");

  useEffect(() => {
    // Em desenvolvimento não existe /version.json; depois de achar uma versão nova, para de conferir
    if (import.meta.env.DEV || status !== "current") return;
    let stopped = false;

    async function check() {
      if (document.visibilityState !== "visible") return;
      const buildId = await publishedBuildId();
      if (!stopped && buildId && buildId !== __BUILD_ID__) setStatus("available");
    }

    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status]);

  if (status !== "available") return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 px-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div
        role="status"
        className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-stone-900 py-2 pr-2 pl-4 text-white shadow-lg"
      >
        <p className="flex-1 text-sm">Saiu uma versão nova do Receita+.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium transition hover:bg-brand-700"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => setStatus("dismissed")}
          aria-label="Fechar aviso"
          className="rounded-lg px-2 py-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
