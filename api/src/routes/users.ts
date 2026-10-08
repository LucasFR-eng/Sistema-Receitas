import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getUserId, isAdmin } from "../lib/auth.js";
import { publishFeedEvent } from "../lib/feed-events.js";
import { prisma } from "../lib/prisma.js";
import { findRecipePage } from "../lib/recipe-queries.js";
import { isOwnImageUrl } from "../lib/storage.js";

// Dados que qualquer pessoa pode ver no perfil (sem e-mail)
const publicProfileSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

const usernameParamsSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/),
});

const profileRecipesQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  bio: z
    .string()
    .trim()
    .max(300, "Use no máximo 300 caracteres")
    .nullish()
    .transform((value) => value || null),
  // Só aceita imagens enviadas pela nossa rota de upload
  avatarUrl: z
    .string()
    .refine(isOwnImageUrl, "Foto inválida")
    .nullish()
    .transform((value) => value ?? null),
});

const notFound = { message: "Perfil não encontrado" };

// Receitas que aparecem no perfil público
const publicRecipesOf = (userId: string) => ({ userId, status: "PUBLISHED" as const, visibility: "PUBLIC" as const });

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/:username", async (request, reply) => {
    const parsed = usernameParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      select: publicProfileSelect,
    });
    if (!user) return reply.status(404).send(notFound);

    const [recipesCount, favoritesReceived, viewerId] = await Promise.all([
      prisma.recipe.count({ where: publicRecipesOf(user.id) }),
      // Quantas vezes as receitas públicas da pessoa foram salvas
      prisma.favorite.count({ where: { recipe: publicRecipesOf(user.id) } }),
      getUserId(request),
    ]);

    return { user, stats: { recipesCount, favoritesReceived }, isMe: viewerId === user.id };
  });

  app.get("/users/:username/recipes", async (request, reply) => {
    const parsed = usernameParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);

    const user = await prisma.user.findUnique({ where: { username: parsed.data.username }, select: { id: true } });
    if (!user) return reply.status(404).send(notFound);

    const { cursor, limit } = profileRecipesQuerySchema.parse(request.query);
    return findRecipePage(publicRecipesOf(user.id), { cursor, limit, userId: await getUserId(request) });
  });

  // Edita o próprio perfil. O @usuário não muda: ele aparece nos créditos e nos links
  app.patch("/me/profile", { onRequest: [app.authenticate] }, async (request) => {
    const data = updateProfileSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data,
      select: { ...publicProfileSelect, email: true, isAdmin: true },
    });
    return { user };
  });

  // Administrador exclui um usuário e tudo dele (receitas, comentários, favoritos, leituras com IA)
  app.delete("/users/:username", { onRequest: [app.authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user.sub))) {
      return reply.status(403).send({ message: "Só administradores podem excluir usuários" });
    }
    const parsed = usernameParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);

    const user = await prisma.user.findUnique({ where: { username: parsed.data.username }, select: { id: true } });
    if (!user) return reply.status(404).send(notFound);
    if (user.id === request.user.sub) {
      return reply.status(400).send({ message: "Você não pode excluir a própria conta por aqui" });
    }

    // Guarda as receitas públicas antes de apagar, para tirá-las do feed de quem está com ele aberto
    const publicRecipes = await prisma.recipe.findMany({ where: publicRecipesOf(user.id), select: { id: true } });
    // As receitas, comentários, favoritos e leituras saem junto (onDelete: Cascade no schema)
    await prisma.user.delete({ where: { id: user.id } });
    for (const recipe of publicRecipes) publishFeedEvent({ type: "recipe:removed", id: recipe.id });
    return reply.status(204).send();
  });
}
