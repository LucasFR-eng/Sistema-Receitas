import type { Difficulty, RecipeInput } from "../types.ts";
import { api, API_URL, ApiError } from "./api.ts";

// Cria uma receita. Se já existir uma igual do usuário, pergunta antes de salvar mesmo assim.
// Devolve o id da receita criada, ou null se o usuário desistir.
export async function createRecipe(input: RecipeInput): Promise<string | null> {
  try {
    const { recipe } = await api<{ recipe: { id: string } }>("/recipes", { method: "POST", body: input });
    return recipe.id;
  } catch (err) {
    if (err instanceof ApiError && err.data.code === "DUPLICATE_RECIPE") {
      return window.confirm(`${err.message}.\n\nSalvar mesmo assim?`)
        ? createRecipe({ ...input, allowDuplicate: true })
        : null;
    }
    throw err;
  }
}

// Cópia da lista da API (api/src/lib/categories.ts) — mantenha as duas iguais
export const RECIPE_CATEGORIES = [
  "Bolos e tortas",
  "Doces e sobremesas",
  "Pães",
  "Salgados e lanches",
  "Massas",
  "Carnes",
  "Aves",
  "Peixes e frutos do mar",
  "Saladas",
  "Sopas e caldos",
  "Acompanhamentos",
  "Bebidas",
  "Café da manhã",
  "Fitness",
  "Vegetariana",
  "Vegana",
  "Outros",
] as const;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Média",
  HARD: "Difícil",
};

// Quantidades que não são números e soam melhor depois do ingrediente ("sal a gosto")
const VAGUE_QUANTITY = /^(a gosto|q\.?\s?b\.?|quanto baste|o quanto baste|opcional)$/i;

// Monta o texto do ingrediente para exibir: a parte de quantidade/unidade (em destaque) e o resto.
//   { quantity: "3", unit: "xícaras", item: "farinha" } -> "3 xícaras" + "de farinha"
//   { quantity: "3", unit: null, item: "ovos" }         -> "3"         + "ovos"
//   { quantity: "a gosto", unit: null, item: "sal" }    -> null        + "sal a gosto"
export function formatIngredient(ingredient: { quantity: string | null; unit: string | null; item: string }) {
  const quantity = ingredient.quantity?.trim() || null;
  const unit = ingredient.unit?.trim() || null;
  const item = ingredient.item.trim();

  if (quantity && VAGUE_QUANTITY.test(quantity)) {
    return { amount: null, rest: `${item} ${quantity}` };
  }
  if (unit) {
    const needsDe = !/^de\s/i.test(item) && !/\sde$/i.test(unit);
    return { amount: [quantity, unit].filter(Boolean).join(" "), rest: needsDe ? `de ${item}` : item };
  }
  return { amount: quantity, rest: item };
}

// 50 -> "50 min", 90 -> "1h30", 120 -> "2h"
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

// Em produção as fotos ficam no Vercel Blob (endereço completo, https://...);
// no desenvolvimento ficam na API e o banco guarda só o caminho (/uploads/...)
export function mediaUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}
