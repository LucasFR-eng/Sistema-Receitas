import { z } from "zod";
import { RECIPE_CATEGORIES } from "../lib/categories.js";

// Formato que qualquer provedor de IA deve devolver ao ler uma receita.
export const extractedRecipeSchema = z.object({
  name: z.string().describe("Nome da receita. Vazio se o conteúdo não for uma receita"),
  description: z.string().nullable().describe("Descrição curta, se houver"),
  category: z
    .enum(RECIPE_CATEGORIES)
    .nullable()
    .describe("Categoria que melhor descreve a receita, ou null se nenhuma servir"),
  prepMinutes: z.number().int().nullable().describe("Tempo total de preparo em minutos"),
  servings: z.number().int().nullable().describe("Quantidade de porções"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).nullable(),
  ingredients: z.array(
    z.object({
      quantity: z.string().nullable().describe("Ex: 2, 1/2, a gosto"),
      unit: z.string().nullable().describe("Ex: xícara, g, colher de sopa"),
      item: z.string().describe("Ex: farinha de trigo"),
    }),
  ),
  steps: z.array(z.string()).describe("Modo de preparo, um passo por item, na ordem"),
  rawText: z.string().describe("Transcrição completa do texto encontrado"),
  warnings: z
    .array(z.string())
    .describe("Problemas encontrados: trechos ilegíveis, quantidades faltando, incoerências"),
});

export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;

// O que pode ser enviado para a IA: um arquivo (foto/PDF) ou um texto
export type RecipeSource =
  | { kind: "file"; data: Buffer; mimeType: string }
  | { kind: "text"; text: string };

// Erros da IA já traduzidos para algo que dá para mostrar ao usuário
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "RATE_LIMITED" | "UNAVAILABLE" | "INVALID_OUTPUT",
    // Erro original do provedor, guardado para aparecer no log
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
