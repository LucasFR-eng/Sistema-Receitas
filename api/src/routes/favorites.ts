import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { isPublicRecipe, recipeSummarySelect, withFavorites } from "../lib/recipe-queries.js";

const idParamsSchema = z.object({ id: z.uuid() });
const notFound = { message: "Receita não encontrada" };

export async function favoriteRoutes(app: FastifyInstance) {
  // Busca a receita e confere se o usuário pode vê-la (pública, ou dele mesmo)
  async function findVisibleRecipe(params: unknown, userId: string) {
    const parsed = idParamsSchema.safeParse(params);
    if (!parsed.success) return null;
    const recipe = await prisma.recipe.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, userId: true, status: true, visibility: true },
    });
    if (!recipe || (recipe.userId !== userId && !isPublicRecipe(recipe))) return null;
    return recipe;
  }

  const countFavorites = (recipeId: string) => prisma.favorite.count({ where: { recipeId } });

  // Salvar receita (chamar duas vezes não duplica)
  app.post("/recipes/:id/favorite", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const recipe = await findVisibleRecipe(request.params, userId);
    if (!recipe) return reply.status(404).send(notFound);

    await prisma.favorite.upsert({
      where: { userId_recipeId: { userId, recipeId: recipe.id } },
      create: { userId, recipeId: recipe.id },
      update: {},
    });
    return { isFavorited: true, favoritesCount: await countFavorites(recipe.id) };
  });

  // Remover dos salvos
  app.delete("/recipes/:id/favorite", { onRequest: [app.authenticate] }, async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);

    // Não exige que a receita ainda seja visível: dá para remover dos salvos mesmo se ela ficou privada
    await prisma.favorite.deleteMany({ where: { userId: request.user.sub, recipeId: parsed.data.id } });
    return { isFavorited: false, favoritesCount: await countFavorites(parsed.data.id) };
  });

  // Receitas salvas pelo usuário, das salvas mais recentemente para as mais antigas
  app.get("/me/favorites", { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;
    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
        // Some da lista se o autor deixar a receita privada ou voltar para rascunho
        recipe: { OR: [{ userId }, { status: "PUBLISHED", visibility: "PUBLIC" }] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { recipe: { select: recipeSummarySelect } },
    });

    return { recipes: await withFavorites(favorites.map((favorite) => favorite.recipe), userId) };
  });
}
