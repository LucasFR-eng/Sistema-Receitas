import type { RecipeFormValues } from "../components/RecipeForm.tsx";
import type { ImportResponse, ImportUsage, RecipeDraft } from "../types.ts";
import { api, postFile } from "./api.ts";

export const MAX_IMPORT_MB = 10;
export const IMPORT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function importFromFile(file: File) {
  return postFile<ImportResponse>("/imports/file", file);
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
