import { useRef, useState, type ChangeEvent } from "react";
import { IMAGE_ACCEPT, isTouchDevice } from "../lib/image.ts";

const buttonClass =
  "rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60";

interface PhotoPickerButtonsProps {
  hasPhoto: boolean;
  uploading: boolean;
  // Câmera aberta pelo botão "Tirar foto": "user" (frontal, selfie) ou "environment" (traseira)
  camera: "user" | "environment";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

// Botões para escolher uma foto. No celular: câmera e galeria separadas (o seletor único nem sempre
// oferece a câmera). No computador: um botão só, que abre o seletor de arquivos.
export function PhotoPickerButtons({ hasPhoto, uploading, camera, onChange }: PhotoPickerButtonsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [isTouch] = useState(isTouchDevice);

  return (
    <>
      {isTouch ? (
        <>
          <button type="button" onClick={() => cameraInput.current?.click()} disabled={uploading} className={buttonClass}>
            {uploading ? "Enviando…" : "📷 Tirar foto"}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={buttonClass}>
            🖼️ Galeria
          </button>
        </>
      ) : (
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={buttonClass}>
          {uploading ? "Enviando…" : hasPhoto ? "Trocar foto" : "Escolher foto"}
        </button>
      )}

      <input ref={fileInput} type="file" accept={IMAGE_ACCEPT} onChange={onChange} className="hidden" />
      <input
        ref={cameraInput}
        type="file"
        accept={IMAGE_ACCEPT}
        capture={camera}
        onChange={onChange}
        className="hidden"
      />
    </>
  );
}
