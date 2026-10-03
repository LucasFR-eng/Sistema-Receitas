import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

// Dados completos, usados na página da receita
export const recipeInclude = {
  user: { select: { id: true, name: true, username: true, avatarUrl: true } },
  ingredients: {
    orderBy: { position: "asc" },
    select: { id: true, quantity: true, unit: true, item: true },
  },
  steps: { orderBy: { position: "asc" }, select: { id: true, description: true } },
  _count: { select: { favorites: true } },
} satisfies Prisma.RecipeInclude;

// Dados resumidos, usados nos cards das listas
export const recipeSummarySelect = {
  id: true,
  name: true,
  description: true,
  photoUrl: true,
  category: true,
  prepMinutes: true,
  servings: true,
  difficulty: true,
  visibility: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { name: true, username: true, avatarUrl: true } },
  _count: { select: { favorites: true } },
} satisfies Prisma.RecipeSelect;

export const isPublicRecipe = (recipe: { status: string; visibility: string }) =>
  recipe.status === "PUBLISHED" && recipe.visibility === "PUBLIC";

// Troca o "_count" do Prisma por favoritesCount e diz se o usuário logado salvou cada receita
export async function withFavorites<T extends { id: string; _count: { favorites: number } }>(
  recipes: T[],
  userId: string | null,
) {
  const saved = new Set<string>();
  if (userId && recipes.length > 0) {
    const favorites = await prisma.favorite.findMany({
      where: { userId, recipeId: { in: recipes.map((recipe) => recipe.id) } },
      select: { recipeId: true },
    });
    for (const favorite of favorites) saved.add(favorite.recipeId);
  }

  return recipes.map(({ _count, ...recipe }) => ({
    ...recipe,
    favoritesCount: _count.favorites,
    isFavorited: saved.has(recipe.id),
  }));
}
