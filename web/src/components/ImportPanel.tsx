import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from "react";
import { ApiError } from "../lib/api.ts";
import { IMAGE_ACCEPT, isTouchDevice, MAX_ORIGINAL_IMAGE_MB } from "../lib/image.ts";
import { getImportUsage, IMPORT_ACCEPT, importFromFile, MAX_PDF_MB } from "../lib/imports.ts";
import type { ImportResponse, ImportUsage } from "../types.ts";

// Mensagens que vão mudando enquanto a IA trabalha, para a espera não parecer travada
function readingMessage(seconds: number) {
  if (seconds < 8) return "Enviando e lendo sua receita…";
  if (seconds < 20) return "Organizando ingredientes e modo de preparo…";
  if (seconds < 40) return "Conferindo se falta alguma coisa…";
  return "A IA está mais lenta agora, mas já está quase lá…";
}

export function ImportPanel({ onImported }: { onImported: (response: ImportResponse) => void }) {
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  const [reading, setReading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorWarnings, setErrorWarnings] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  // Celular e tablet: botões separados para câmera e galeria (o seletor único nem sempre oferece a câmera)
  const [isTouch] = useState(isTouchDevice);

  useEffect(() => {
    getImportUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  useEffect(() => {
    if (!reading) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [reading]);

  async function handleFile(file: File | undefined) {
    if (!file || reading) return;
    setError(null);
    setErrorWarnings([]);

    if (!IMPORT_ACCEPT.split(",").includes(file.type)) {
      setError("Envie uma foto (JPG, PNG ou WEBP) ou um PDF.");
      return;
    }
    // Fotos são reduzidas antes do envio; PDFs vão como estão
    const isPdf = file.type === "application/pdf";
    const maxMb = isPdf ? MAX_PDF_MB : MAX_ORIGINAL_IMAGE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      setError(isPdf ? `O PDF pode ter no máximo ${maxMb} MB.` : `A foto pode ter no máximo ${maxMb} MB.`);
      return;
    }

    setReading(true);
    try {
      onImported(await importFromFile(file));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Array.isArray(err.data.warnings)) setErrorWarnings(err.data.warnings as string[]);
        if (err.data.usage) setUsage(err.data.usage as ImportUsage);
      } else {
        setError("Algo deu errado. Tente novamente.");
      }
    } finally {
      setReading(false);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  // No computador a área inteira abre o seletor (ignora o clique que o próprio input repassa)
  function handleAreaClick(event: MouseEvent) {
    if (event.target instanceof HTMLInputElement) return;
    fileInput.current?.click();
  }

  const noCredits = usage?.remaining === 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
      {reading ? (
        <div role="status" className="flex flex-col items-center px-4 py-14 text-center">
          <span className="size-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-5 font-medium">{readingMessage(seconds)}</p>
          <p className="mt-1 text-sm text-stone-500">{seconds}s · normalmente leva menos de 1 minuto</p>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={isTouch ? undefined : handleAreaClick}
          className={`flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-12 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
            noCredits ? "pointer-events-none opacity-50" : ""
          } ${
            dragging
              ? "border-brand-500 bg-brand-50"
              : `border-stone-300 ${isTouch ? "" : "cursor-pointer hover:border-brand-400 hover:bg-stone-50"}`
          }`}
        >
          <span className="text-4xl" aria-hidden>
            📸
          </span>
          <span className="mt-3 text-lg font-semibold">Envie a foto ou o PDF da receita</span>
          <span className="mt-1 text-sm text-stone-600">
            Pode ser de livro, impressa ou escrita à mão. A IA lê e preenche tudo para você.
          </span>

          {isTouch ? (
            <>
              <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
                <button
                  type="button"
                  disabled={noCredits}
                  onClick={() => cameraInput.current?.click()}
                  className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition active:bg-brand-700"
                >
                  📷 Tirar foto da receita
                </button>
                <button
                  type="button"
                  disabled={noCredits}
                  onClick={() => fileInput.current?.click()}
                  className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition active:bg-stone-100"
                >
                  🖼️ Escolher da galeria ou PDF
                </button>
              </div>
              <span className="mt-3 text-xs text-stone-500">foto ou PDF até {MAX_PDF_MB} MB</span>
            </>
          ) : (
            <>
              <span className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm">
                Escolher arquivo
              </span>
              <span className="mt-2 text-xs text-stone-500">
                ou arraste aqui · foto (JPG, PNG, WEBP) ou PDF até {MAX_PDF_MB} MB
              </span>
            </>
          )}

          <input
            ref={fileInput}
            type="file"
            accept={IMPORT_ACCEPT}
            disabled={noCredits}
            aria-label="Escolher foto ou PDF da receita"
            tabIndex={isTouch ? -1 : undefined}
            onChange={handleInputChange}
            className="sr-only"
          />
          {/* capture="environment" abre direto a câmera traseira */}
          <input
            ref={cameraInput}
            type="file"
            accept={IMAGE_ACCEPT}
            capture="environment"
            disabled={noCredits}
            tabIndex={-1}
            aria-hidden
            onChange={handleInputChange}
            className="sr-only"
          />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          <p>{error}</p>
          {errorWarnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {errorWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {usage && (
        <p className="mt-4 text-center text-sm text-stone-500">
          {usage.limit === null
            ? "Seu plano tem leituras com IA ilimitadas."
            : noCredits
              ? "Você usou todas as leituras com IA deste mês. O limite renova no dia 1º."
              : `Você tem ${usage.remaining} de ${usage.limit} leituras com IA este mês.`}
        </p>
      )}
    </div>
  );
}
