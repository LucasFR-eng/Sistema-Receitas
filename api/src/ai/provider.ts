import { env } from "../env.js";
import { GeminiProvider } from "./gemini.js";
import type { ExtractedRecipe, RecipeFile } from "./types.js";

// Contrato que todo provedor de IA implementa.
// Para trocar de fornecedor (Gemini, Claude, etc.), basta criar outra classe
// com estes métodos e mudar AI_PROVIDER no .env.
export interface AIProvider {
  extractRecipe(file: RecipeFile): Promise<ExtractedRecipe>;
}

let provider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!provider) {
    switch (env.AI_PROVIDER) {
      case "gemini":
        provider = new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
        break;
    }
  }
  return provider;
}
