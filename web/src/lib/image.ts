// Fotos de celular costumam ter de 3 a 15 MB. Aceitamos o original até este tamanho
// e reduzimos no navegador antes de enviar (a Vercel não aceita envios acima de 4,5 MB).
export const MAX_ORIGINAL_IMAGE_MB = 25;

// Fotos aceitas no envio (o servidor confere o tipo real pelos primeiros bytes)
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

// Celular ou tablet (tela de toque): mostra botões separados para câmera e galeria
export function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

const JPEG_QUALITY = 0.85;
// Abaixo disso, se a imagem já não for grande demais, envia como está
const SMALL_FILE_BYTES = 1_000_000;

// Redimensiona para que o lado maior tenha no máximo `maxDimension` pixels e converte para JPEG.
// Também deixa a leitura da IA mais rápida e barata (menos pixels para processar).
export async function compressImage(file: File, maxDimension: number): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  // createImageBitmap já corrige a rotação de fotos tiradas com o celular "deitado"
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SMALL_FILE_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  // Fundo branco: o JPEG não tem transparência, e PNGs transparentes ficariam com fundo preto
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
