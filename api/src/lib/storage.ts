import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

// Dois "motores" de armazenamento:
// - Vercel Blob, quando o projeto está conectado a um Blob store (produção na Vercel, que não tem disco).
//   A biblioteca @vercel/blob se autentica sozinha com BLOB_STORE_ID + OIDC, ou com BLOB_READ_WRITE_TOKEN
// - pasta local (desenvolvimento), servida pela própria API em /api/uploads
//   (o banco guarda "/uploads/arquivo.jpg"; o front acrescenta o "/api")
export const useBlobStorage = Boolean(env.BLOB_STORE_ID || env.BLOB_READ_WRITE_TOKEN);

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
export const UPLOAD_URL_PREFIX = "/uploads/";

if (!useBlobStorage) mkdirSync(UPLOAD_ROOT, { recursive: true });

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Salva o arquivo e devolve o endereço dele (caminho local ou URL do Blob)
export async function saveFile(data: Buffer, extension: string): Promise<string> {
  const fileName = `${randomUUID()}.${extension}`;

  if (useBlobStorage) {
    const blob = await put(`uploads/${fileName}`, data, {
      access: "public",
      contentType: MIME_TYPES[extension],
    });
    return blob.url;
  }

  await writeFile(path.join(UPLOAD_ROOT, fileName), data);
  return `${UPLOAD_URL_PREFIX}${fileName}`;
}

// Aceita só imagens enviadas pela nossa rota de upload (evita apontar para sites de terceiros)
export function isOwnImageUrl(url: string): boolean {
  if (/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url)) return true;
  if (!useBlobStorage) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
      /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
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
