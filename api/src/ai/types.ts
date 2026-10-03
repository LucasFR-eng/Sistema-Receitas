import { z } from "zod";

// Formato que qualquer provedor de IA deve devolver ao ler uma receita.
export const extractedRecipeSchema = z.object({
  name: z.string().describe("Nome da receita"),
  description: z.string().nullable().describe("Descrição curta, se houver"),
  category: z.string().nullable().describe("Categoria, ex: doces, salgados, bebidas"),
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
  rawText: z.string().describe("Transcrição completa do texto encontrado no arquivo"),
  warnings: z
    .array(z.string())
    .describe("Problemas encontrados: trechos ilegíveis, quantidades faltando, incoerências"),
});

export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;

export interface RecipeFile {
  data: Buffer;
  mimeType: string;
}
