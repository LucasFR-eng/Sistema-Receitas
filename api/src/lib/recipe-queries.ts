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
  // Receita de outra pessoa em que esta se baseou ("Fazer minha versão")
  originalRecipe: {
    select: {
      id: true,
      name: true,
      userId: true,
      status: true,
      visibility: true,
      user: { select: { name: true, username: true } },
    },
  },
  _count: {
    select: {
      favorites: true,
      // Conta só as versões que qualquer pessoa pode ver
      versions: { where: { status: "PUBLISHED", visibility: "PUBLIC" } },
    },
  },
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

// Lista paginada de receitas (mais novas primeiro), usada no feed e no perfil público
export async function findRecipePage(
  where: Prisma.RecipeWhereInput,
  { cursor, limit, userId }: { cursor?: string; limit: number; userId: string | null },
) {
  // Busca um item a mais só para saber se existe próxima página
  const recipes = await prisma.recipe.findMany({
    where,
    select: recipeSummarySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = recipes.length > limit;
  const page = hasMore ? recipes.slice(0, limit) : recipes;

  return {
    recipes: await withFavorites(page, userId),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

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
