import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { getUserId } from "../lib/auth.js";
import { RECIPE_CATEGORIES } from "../lib/categories.js";
import { prisma } from "../lib/prisma.js";
import { normalizeText } from "../lib/text.js";

// Dados completos, usados na página da receita
const recipeInclude = {
  user: { select: { id: true, name: true, username: true, avatarUrl: true } },
  ingredients: {
    orderBy: { position: "asc" },
    select: { id: true, quantity: true, unit: true, item: true },
  },
  steps: { orderBy: { position: "asc" }, select: { id: true, description: true } },
} satisfies Prisma.RecipeInclude;

// Dados resumidos, usados nos cards das listas
const recipeSummarySelect = {
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
} satisfies Prisma.RecipeSelect;

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

    return { recipes: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  });

  // Todas as receitas do usuário logado (rascunhos e privadas incluídos)
  app.get("/me/recipes", { onRequest: [app.authenticate] }, async (request) => {
    const recipes = await prisma.recipe.findMany({
      where: { userId: request.user.sub },
      select: recipeSummarySelect,
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return { recipes };
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
    const isPublic = recipe?.status === "PUBLISHED" && recipe.visibility === "PUBLIC";

    // Receita privada ou rascunho de outra pessoa: responde como se não existisse
    if (!recipe || (!isOwner && !isPublic)) return reply.status(404).send(notFound);

    // O texto original é material de trabalho do dono; não vai para quem só está vendo a receita
    const { fingerprint: _, sourceText, ...publicRecipe } = recipe;
    return { recipe: isOwner ? { ...publicRecipe, sourceText } : publicRecipe, isOwner };
  });

  app.post("/recipes", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const { allowDuplicate, importId, ingredients, steps, ...fields } = recipeInputSchema.parse(request.body);
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

    return reply.status(201).send({ recipe });
  });

  app.put("/recipes/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);
    const { id } = parsed.data;

    const existing = await prisma.recipe.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== request.user.sub) return reply.status(404).send(notFound);

    const {
      allowDuplicate: _allowDuplicate,
      importId: _importId,
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

    return { recipe };
  });

  app.delete("/recipes/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.status(404).send(notFound);
    const { id } = parsed.data;

    const existing = await prisma.recipe.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== request.user.sub) return reply.status(404).send(notFound);

    await prisma.recipe.delete({ where: { id } });
    return reply.status(204).send();
  });
}
