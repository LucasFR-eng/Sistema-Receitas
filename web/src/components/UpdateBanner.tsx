import { useEffect, useState } from "react";

// Enquanto o app fica aberto, confere de tempos em tempos se saiu um deploy novo
const CHECK_EVERY_MS = 5 * 60 * 1000;
// Última versão que este aparelho abriu, para avisar "foi atualizado" na próxima abertura
const LAST_BUILD_KEY = "last-build-id";

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

// Abriu numa versão diferente da última aberta neste aparelho? Guarda a atual para avisar só uma vez.
// Na primeira visita não há versão guardada, então não avisa.
function openedNewVersion(): boolean {
  if (import.meta.env.DEV) return false;
  try {
    const last = localStorage.getItem(LAST_BUILD_KEY);
    localStorage.setItem(LAST_BUILD_KEY, __BUILD_ID__);
    return last !== null && last !== __BUILD_ID__;
  } catch {
    // Sem armazenamento (ex: aba anônima): sem como comparar
    return false;
  }
}

type Status = "current" | "updated" | "available" | "dismissed";

// Avisos de versão:
// - "foi atualizado": quem abre o app depois de um deploy novo
// - "saiu uma versão nova": quem deixou o app aberto (principalmente o instalado, que fica em
//   segundo plano). Confere ao voltar para o app e a cada 5 minutos, e recarrega com um toque.
export function UpdateBanner() {
  const [status, setStatus] = useState<Status>(() => (openedNewVersion() ? "updated" : "current"));

  useEffect(() => {
    // Em desenvolvimento não existe /version.json; depois de achar uma versão nova, para de conferir
    if (import.meta.env.DEV || status === "available" || status === "dismissed") return;
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

  if (status !== "available" && status !== "updated") return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 px-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div
        role="status"
        className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-stone-900 py-2 pr-2 pl-4 text-white shadow-lg"
      >
        {status === "available" ? (
          <>
            <p className="flex-1 text-sm">Saiu uma versão nova do Receita+.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium transition hover:bg-brand-700"
            >
              Atualizar
            </button>
          </>
        ) : (
          <p className="flex-1 py-2 text-sm">O Receita+ foi atualizado ✨</p>
        )}
        <button
          type="button"
          // Fechar o "foi atualizado" não impede o aviso de uma próxima versão
          onClick={() => setStatus(status === "updated" ? "current" : "dismissed")}
          aria-label="Fechar aviso"
          className="rounded-lg px-2 py-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
