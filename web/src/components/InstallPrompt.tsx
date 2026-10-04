import { useEffect, useState } from "react";

// Evento do Chrome (Android) que deixa abrir a instalação a partir de um botão do próprio site
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed-at";
// Depois de "Agora não", o aviso volta só depois desse tempo
const DISMISS_DAYS = 14;

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone ou iPad (o iPad recente se apresenta como Mac, mas tem tela de toque)
function isIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Aviso no celular para instalar o site na tela inicial.
// Android: o botão abre a instalação do Chrome. iPhone: a Apple não permite abrir por código,
// então o aviso explica o caminho pelo botão Compartilhar do Safari.
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(
    () => isInstalled() || recentlyDismissed() || !window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    if (hidden) return;

    function handleBeforeInstall(event: Event) {
      // Segura o aviso padrão do Chrome para mostrar o nosso no lugar
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setHidden(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [hidden]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Sem armazenamento (ex: aba anônima): o aviso só some até recarregar a página
    }
    setHidden(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setHidden(true);
    else dismiss();
  }

  const ios = isIOS();
  if (hidden || (!installEvent && !ios)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pt-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        role="dialog"
        aria-label="Instalar o Receita+"
        className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-stone-200"
      >
        <img src="/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />

        {ios ? (
          <>
            <p className="flex-1 text-sm text-stone-700">
              Instale o <strong>Receita+</strong>: toque em <ShareIcon /> <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
            >
              Entendi
            </button>
          </>
        ) : (
          <>
            <p className="flex-1 text-sm text-stone-700">
              Instale o <strong>Receita+</strong> no celular e abra direto da tela inicial.
            </p>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Instalar
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100"
              >
                Agora não
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Ícone de Compartilhar do Safari (quadrado com seta para cima)
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="inline size-4 -translate-y-0.5 text-brand-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
