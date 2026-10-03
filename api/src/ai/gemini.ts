import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { EXTRACT_FROM_FILE_PROMPT, EXTRACT_FROM_TEXT_PROMPT } from "./prompts.js";
import type { AIProvider } from "./provider.js";
import { AIError, extractedRecipeSchema, type ExtractedRecipe, type RecipeSource } from "./types.js";

const responseJsonSchema = z.toJSONSchema(extractedRecipeSchema);

// Esperas entre tentativas quando o modelo está sobrecarregado (503) ou com erro interno (500)
const RETRY_DELAYS_MS = [1_000, 3_000];

const isTemporary = (error: unknown) =>
  error instanceof ApiError && (error.status === 500 || error.status === 503);

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | undefined;
  private readonly models: string[];

  constructor(
    private readonly apiKey: string | undefined,
    model: string,
    // Modelos reserva, usados se o principal continuar indisponível depois das tentativas
    fallbackModels: string[] = [],
  ) {
    this.models = [model, ...fallbackModels.filter((fallback) => fallback !== model)];
  }

  private getClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new AIError("A IA não está configurada (GEMINI_API_KEY ausente no .env)", "NOT_CONFIGURED");
    }
    this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
    return this.client;
  }

  async extractRecipe(source: RecipeSource): Promise<ExtractedRecipe> {
    const parts: Part[] =
      source.kind === "file"
        ? [
            { inlineData: { mimeType: source.mimeType, data: source.data.toString("base64") } },
            { text: EXTRACT_FROM_FILE_PROMPT },
          ]
        : [{ text: EXTRACT_FROM_TEXT_PROMPT }, { text: source.text }];

    const text = await this.generate(parts);

    const parsed = extractedRecipeSchema.safeParse(text ? safeJson(text) : null);
    if (!parsed.success) {
      throw new AIError("A IA devolveu uma resposta inválida. Tente novamente.", "INVALID_OUTPUT", {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  // Tenta cada modelo (principal e reservas), repetindo quando o erro é temporário
  private async generate(parts: Part[]): Promise<string | undefined> {
    const client = this.getClient();
    let lastError: unknown;

    for (const model of this.models) {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: { responseMimeType: "application/json", responseJsonSchema },
          });
          return response.text;
        } catch (error) {
          lastError = error;
          if (!isTemporary(error)) break;
          const delay = RETRY_DELAYS_MS[attempt];
          if (delay !== undefined) await sleep(delay);
        }
      }

      // 429 = cota do plano gratuito esgotada (por minuto ou por dia); trocar de modelo não ajuda
      if (lastError instanceof ApiError && lastError.status === 429) {
        throw new AIError("A IA atingiu o limite de uso. Tente novamente em alguns minutos.", "RATE_LIMITED", {
          cause: lastError,
        });
      }
    }

    throw new AIError("A IA está indisponível no momento. Tente novamente.", "UNAVAILABLE", { cause: lastError });
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
