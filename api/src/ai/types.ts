import { z } from "zod";
import { RECIPE_CATEGORIES } from "../lib/categories.js";

// Como a IA classifica o que recebeu; só RECIPE segue adiante
export const CONTENT_TYPES = ["RECIPE", "NOT_RECIPE", "INAPPROPRIATE"] as const;

// Formato que qualquer provedor de IA deve devolver ao ler uma receita.
export const extractedRecipeSchema = z.object({
  contentType: z
    .enum(CONTENT_TYPES)
    .describe(
      "RECIPE se for uma receita culinária; NOT_RECIPE se for outra coisa; INAPPROPRIATE se tiver conteúdo sexual, violento, ofensivo ou ilegal",
    ),
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

// Resultado vazio para conteúdo recusado (ex: bloqueado pelo filtro de segurança do provedor)
export function rejectedResult(contentType: Exclude<ExtractedRecipe["contentType"], "RECIPE">): ExtractedRecipe {
  return {
    contentType,
    name: "",
    description: null,
    category: null,
    prepMinutes: null,
    servings: null,
    difficulty: null,
    ingredients: [],
    steps: [],
    rawText: "",
    warnings: [],
  };
}

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
