import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { EXTRACT_RECIPE_PROMPT } from "./prompts.js";
import type { AIProvider } from "./provider.js";
import { extractedRecipeSchema, type ExtractedRecipe, type RecipeFile } from "./types.js";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | undefined;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  private getClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY não configurada no .env");
    }
    this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
    return this.client;
  }

  async extractRecipe(file: RecipeFile): Promise<ExtractedRecipe> {
    const response = await this.getClient().models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.mimeType, data: file.data.toString("base64") } },
            { text: EXTRACT_RECIPE_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(extractedRecipeSchema),
      },
    });

    if (!response.text) {
      throw new Error("A IA não retornou conteúdo");
    }

    return extractedRecipeSchema.parse(JSON.parse(response.text));
  }
}
