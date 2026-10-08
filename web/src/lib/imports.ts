import type { RecipeFormValues } from "../components/RecipeForm.tsx";
import type { ImportResponse, ImportUsage, RecipeDraft } from "../types.ts";
import { api, postFile } from "./api.ts";
import { compressImage } from "./image.ts";

// PDFs são enviados como estão (a Vercel aceita até 4,5 MB); fotos são reduzidas antes
export const MAX_PDF_MB = 4;
export const IMPORT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMPORT_ACCEPT = `${IMPORT_IMAGE_ACCEPT},application/pdf`;

// 2000px no lado maior mantém letras pequenas legíveis para a IA
export async function importFromFile(file: File) {
  return postFile<ImportResponse>("/imports/file", await compressImage(file, 2000));
}

export function importFromText(text: string) {
  return api<ImportResponse>("/imports/text", { method: "POST", body: { text } });
}

export function getImportUsage() {
  return api<ImportUsage>("/imports/usage");
}

// Converte o rascunho da IA para o formato que o formulário entende
export function draftToFormValues(draft: RecipeDraft): RecipeFormValues {
  return {
    ...draft,
    freeText: null,
    steps: draft.steps.map((description) => ({ description })),
  };
}
