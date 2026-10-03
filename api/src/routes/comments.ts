import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getUserId } from "../lib/auth.js";
import { publishRecipeEvent, subscribeToRecipe } from "../lib/feed-events.js";
import { prisma } from "../lib/prisma.js";
import { findVisibleRecipe } from "../lib/recipe-queries.js";
import { openEventStream } from "../lib/sse.js";

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  user: { select: { name: true, username: true, avatarUrl: true } },
} as const;

const idParamsSchema = z.object({ id: z.uuid() });

const listQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const commentInputSchema = z.object({
  content: z.string().trim().min(1, "Escreva um comentário").max(1_000, "Use no máximo 1000 caracteres"),
});

const recipeNotFound = { message: "Receita não encontrada" };

export async function commentRoutes(app: FastifyInstance) {
  // Comentários de uma receita, dos mais novos para os mais antigos
  app.get("/recipes/:id/comments", async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(404).send(recipeNotFound);
    const recipe = await findVisibleRecipe(params.data.id, await getUserId(request));
    if (!recipe) return reply.status(404).send(recipeNotFound);

    const { cursor, limit } = listQuerySchema.parse(request.query);
    const comments = await prisma.comment.findMany({
      where: { recipeId: recipe.id },
      select: commentSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = comments.length > limit;
    const page = hasMore ? comments.slice(0, limit) : comments;
    return { comments: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  });

  // No máximo 10 comentários por minuto, para dificultar spam
  app.post(
    "/recipes/:id/comments",
    { onRequest: [app.authenticate], config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(404).send(recipeNotFound);
      const recipe = await findVisibleRecipe(params.data.id, request.user.sub);
      if (!recipe) return reply.status(404).send(recipeNotFound);

      const { content } = commentInputSchema.parse(request.body);
      const comment = await prisma.comment.create({
        data: { recipeId: recipe.id, userId: request.user.sub, content },
        select: commentSelect,
      });

      publishRecipeEvent(recipe.id, { type: "comment:created", comment });
      return reply.status(201).send({ comment });
    },
  );

  // Quem pode apagar: quem escreveu o comentário ou o dono da receita (moderação)
  app.delete("/comments/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(404).send({ message: "Comentário não encontrado" });

    const comment = await prisma.comment.findUnique({
      where: { id: params.data.id },
      select: { id: true, userId: true, recipeId: true, recipe: { select: { userId: true } } },
    });
    if (!comment) return reply.status(404).send({ message: "Comentário não encontrado" });

    const userId = request.user.sub;
    if (comment.userId !== userId && comment.recipe.userId !== userId) {
      return reply.status(403).send({ message: "Você não pode apagar este comentário" });
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    publishRecipeEvent(comment.recipeId, { type: "comment:deleted", id: comment.id });
    return reply.status(204).send();
  });

  // Eventos em tempo real de uma receita (comentários novos e apagados)
  app.get("/recipes/:id/events", async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(404).send(recipeNotFound);
    const recipe = await findVisibleRecipe(params.data.id, await getUserId(request));
    if (!recipe) return reply.status(404).send(recipeNotFound);

    openEventStream(request, reply, (send) => subscribeToRecipe(recipe.id, send));
  });
}
