import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
export const UPLOAD_URL_PREFIX = "/uploads/";

mkdirSync(UPLOAD_ROOT, { recursive: true });

// Em desenvolvimento os arquivos ficam numa pasta local.
// Em produção, basta trocar esta função para enviar ao Cloudflare R2; quem a usa não muda.
export async function saveFile(data: Buffer, extension: string): Promise<string> {
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(path.join(UPLOAD_ROOT, fileName), data);
  return `${UPLOAD_URL_PREFIX}${fileName}`;
}

const IMAGE_MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

// Arquivos aceitos na importação com IA: imagens ou PDF
export function detectImportFileType(
  data: Buffer,
): { extension: string; mimeType: string; type: "IMAGE" | "PDF" } | null {
  const image = detectImageType(data);
  if (image) return { extension: image, mimeType: IMAGE_MIME[image], type: "IMAGE" };
  if (data.toString("ascii", 0, 5) === "%PDF-") return { extension: "pdf", mimeType: "application/pdf", type: "PDF" };
  return null;
}

// Confere o tipo real pelos primeiros bytes do arquivo ("assinatura"),
// porque o tipo informado pelo navegador pode ser falsificado.
export function detectImageType(data: Buffer): "jpg" | "png" | "webp" | null {
  if (data.length < 12) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}
