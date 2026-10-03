import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { getUserId } from "../lib/auth.js";
import { RECIPE_CATEGORIES } from "../lib/categories.js";
import { publishFeedEvent } from "../lib/feed-events.js";
import { prisma } from "../lib/prisma.js";
import {
  findRecipePage,
  isPublicRecipe,
  recipeInclude,
  recipeSummarySelect,
  withFavorites,
} from "../lib/recipe-queries.js";
import { normalizeText } from "../lib/text.js";

// Texto opcional: string vazia vira null
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .nullish()
    .transform((value) => value || null);

const optionalNumber = (max: number, label: string) =>
  z
    .number(`${label} precisa ser um número`)
    .int(`${label} precisa ser um número inteiro`)
    .min(1, `${label} precisa ser maior que zero`)
    .max(max, `${label} muito alto`)
    .nullish()
    .transform((value) => value ?? null);

const recipeInputSchema = z
  .object({
    name: z.string().trim().min(2, "Dê um nome para a receita").max(120, "Nome muito longo"),
    description: optionalText(500),
    // Só aceita imagens enviadas pela nossa rota de upload
    photoUrl: z
      .string()
      .regex(/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/, "Foto inválida")
      .nullish()
      .transform((value) => value ?? null),
    category: z
      .enum(RECIPE_CATEGORIES, "Escolha uma categoria da lista")
      .nullish()
      .transform((value) => value ?? null),
    prepMinutes: optionalNumber(10_000, "Tempo de preparo"),
    servings: optionalNumber(1_000, "Porções"),
    difficulty: z
      .enum(["EASY", "MEDIUM", "HARD"])
      .nullish()
      .transform((value) => value ?? null),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    status: z.enum(["DRAFT", "PUBLISHED"]),
    freeText: optionalText(20_000),
    sourceText: optionalText(20_000),
    ingredients: z
      .array(
        z.object({
          quantity: optionalText(30),
          unit: optionalText(40),
          item: z.string().trim().min(1, "Informe o ingrediente").max(150, "Ingrediente muito longo"),
        }),
      )
      .max(100, "Máximo de 100 ingredientes"),
    steps: z
      .array(z.string().trim().min(1, "O passo não pode ficar vazio").max(2_000, "Passo muito longo"))
      .max(100, "Máximo de 100 passos"),
    // true quando o usuário confirmou que quer salvar mesmo havendo uma receita igual
    allowDuplicate: z.boolean().optional(),
    // Importação com IA que originou a receita (para histórico)
    importId: z.uuid().optional(),
    // Receita de outra pessoa que serviu de base ("Fazer minha versão"); só vale na criação
    originalRecipeId: z.uuid().optional(),
  })
  .superRefine((data, ctx) => {
    // Rascunho pode ficar incompleto; para publicar, precisa de ingredientes e passos
    if (data.status !== "PUBLISHED") return;
    if (data.ingredients.length === 0) {
      ctx.addIssue({ code: "custom", path: ["ingredients"], message: "Adicione pelo menos um ingrediente" });
    }
    if (data.steps.length === 0) {
      ctx.addIssue({ code: "custom", path: ["steps"], message: "Adicione pelo menos um passo" });
    }
  });

type RecipeInput = z.infer<typeof recipeInputSchema>;

const idParamsSchema = z.object({ id: z.uuid("Receita não encontrada") });

const feedQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(RECIPE_CATEGORIES).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// Mesmo nome + mesmos ingredientes = mesma impressão digital (ignora acentos, maiúsculas e ordem)
function computeFingerprint(name: string, items: string[]): string {
  const key = `${normalizeText(name)}|${items.map(normalizeText).sort().join(",")}`;
  return createHash("sha256").update(key).digest("hex");
}

function buildIngredients(ingredients: RecipeInput["ingredients"]) {
  return ingredients.map((ingredient, index) => ({
    ...ingredient,
    itemNormalized: normalizeText(ingredient.item),
    position: index,
  }));
}

function buildSteps(steps: RecipeInput["steps"]) {
  return steps.map((description, index) => ({ description, position: index }));
}

const notFound = { message: "Receita não encontrada" };

// Avisa quem está com o feed aberto: receita nova no feed, alterada ou que saiu dele
async function notifyFeed(id: string, wasPublic: boolean) {
  const found = await prisma.recipe.findUnique({ where: { id }, select: recipeSummarySelect });
  const nowPublic = found !== null && isPublicRecipe(found);
  // O aviso vai para todo mundo, então não diz se "você" salvou a receita
  const recipe = found && (await withFavorites([found], null))[0];

  if (nowPublic && !wasPublic) publishFeedEvent({ type: "recipe:published", recipe });
  else if (nowPublic) publishFeedEvent({ type: "recipe:updated", recipe });
  else if (wasPublic) publishFeedEvent({ type: "recipe:removed", id });
}

export async function recipeRoutes(app: FastifyInstance) {
  // Feed público: receitas publicadas e públicas, das mais novas para as mais antigas
  app.get("/recipes", async (request) => {
    const { q, category, cursor, limit } = feedQuerySchema.parse(request.query);

    const where: Prisma.RecipeWhereInput = {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      ...(category && { category }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { ingredients: { some: { itemNormalized: { contains: normalizeText(q) } } } },
        ],
      }),
    };

    return findRecipePage(where, { cursor, limit, userId: await getUserId(request) });
  });

  // Todas as receitas do usuário logado (rascunhos e privadas incluídos)
  app.get("/me/recipes", { onRequest: [app.authenticate] }, async (request) => {
    const recipes = await prisma.recipe.findMany({
      where: { userId: request.user.sub },
      select: recipeSummarySelect,
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return { recipes: await withFavorites(recipes, request.user.sub) };
  });

  app.get("/recipes/:id", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);

    const userId = await getUserId(request);
    const recipe = await prisma.recipe.findUnique({
      where: { id: parsed.data.id },
      include: recipeInclude,
    });

    const isOwner = recipe?.userId === userId;

    // Receita privada ou rascunho de outra pessoa: responde como se não existisse
    if (!recipe || (!isOwner && !isPublicRecipe(recipe))) return reply.status(404).send(notFound);

    // Crédito da receita original. O autor sempre aparece; o link só se quem está vendo
    // ainda pode abrir a original (pública, ou do próprio visitante)
    const { originalRecipe, originalRecipeId: _originalId, ...rest } = recipe;
    const basedOn = originalRecipe && {
      author: { name: originalRecipe.user.name, username: originalRecipe.user.username },
      ...((isPublicRecipe(originalRecipe) || originalRecipe.userId === userId) && {
        id: originalRecipe.id,
        name: originalRecipe.name,
      }),
    };

    // O texto original é material de trabalho do dono; não vai para quem só está vendo a receita
    const [detailed] = await withFavorites([rest], userId);
    const { fingerprint: _, sourceText, ...publicRecipe } = detailed!;
    const response = { ...publicRecipe, basedOn, versionsCount: recipe._count.versions };
    return { recipe: isOwner ? { ...response, sourceText } : response, isOwner };
  });

  app.post("/recipes", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const { allowDuplicate, importId, originalRecipeId, ingredients, steps, ...fields } = recipeInputSchema.parse(
      request.body,
    );

    // A receita de origem precisa ser pública e de outra pessoa
    if (originalRecipeId) {
      const original = await prisma.recipe.findUnique({
        where: { id: originalRecipeId },
        select: { userId: true, status: true, visibility: true },
      });
      if (!original || !isPublicRecipe(original)) {
        return reply.status(400).send({ message: "A receita original não está mais disponível" });
      }
      if (original.userId === userId) {
        return reply.status(400).send({ message: "Essa receita já é sua. Para mudar algo, é só editá-la." });
      }
    }

    const fingerprint = computeFingerprint(
      fields.name,
      ingredients.map((ingredient) => ingredient.item),
    );

    if (!allowDuplicate) {
      const duplicate = await prisma.recipe.findFirst({
        where: { userId, fingerprint },
        select: { id: true, name: true },
      });
      if (duplicate) {
        return reply.status(409).send({
          code: "DUPLICATE_RECIPE",
          message: `Você já tem uma receita igual: "${duplicate.name}"`,
          duplicate,
        });
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        ...fields,
        userId,
        fingerprint,
        originalRecipeId: originalRecipeId ?? null,
        ingredients: { create: buildIngredients(ingredients) },
        steps: { create: buildSteps(steps) },
      },
      select: { id: true },
    });

    if (importId) {
      // updateMany com userId garante que só liga importações do próprio usuário
      await prisma.recipeImport.updateMany({
        where: { id: importId, userId },
        data: { recipeId: recipe.id },
      });
    }

    await notifyFeed(recipe.id, false);
    return reply.status(201).send({ recipe });
  });

  app.put("/recipes/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);
    const { id } = parsed.data;

    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { userId: true, status: true, visibility: true },
    });
    if (!existing || existing.userId !== request.user.sub) return reply.status(404).send(notFound);

    const {
      allowDuplicate: _allowDuplicate,
      importId: _importId,
      // O crédito da receita original não muda depois de criada
      originalRecipeId: _originalRecipeId,
      ingredients,
      steps,
      ...fields
    } = recipeInputSchema.parse(request.body);

    // Substitui ingredientes e passos pelos novos (o Prisma faz tudo numa transação)
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...fields,
        fingerprint: computeFingerprint(
          fields.name,
          ingredients.map((ingredient) => ingredient.item),
        ),
        ingredients: { deleteMany: {}, create: buildIngredients(ingredients) },
        steps: { deleteMany: {}, create: buildSteps(steps) },
      },
      select: { id: true },
    });

    await notifyFeed(id, isPublicRecipe(existing));
    return { recipe };
  });

  app.delete("/recipes/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);
    const { id } = parsed.data;

    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { userId: true, status: true, visibility: true },
    });
    if (!existing || existing.userId !== request.user.sub) return reply.status(404).send(notFound);

    await prisma.recipe.delete({ where: { id } });
    if (isPublicRecipe(existing)) publishFeedEvent({ type: "recipe:removed", id });
    return reply.status(204).send();
  });
}
