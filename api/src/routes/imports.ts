import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { getAIProvider } from "../ai/provider.js";
import { extractedRecipeSchema, type ExtractedRecipe, type RecipeSource } from "../ai/types.js";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { detectImportFileType, saveFile } from "../lib/storage.js";

export const MAX_IMPORT_MB = 10;

// Leituras com IA são caras: no máximo 5 por minuto por usuário, além do limite mensal
const importRateLimit = { rateLimit: { max: 5, timeWindow: "1 minute" } };

const textSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Escreva um pouco mais da receita para a IA conseguir organizar")
    .max(20_000, "Texto muito longo"),
});

async function getUsage(userId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Conta só leituras que usaram a IA de verdade (reaproveitadas e com erro não contam)
  const used = await prisma.recipeImport.count({
    where: { userId, fromCache: false, status: { not: "FAILED" }, createdAt: { gte: startOfMonth } },
  });
  const limit = env.IMPORT_MONTHLY_LIMIT;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

const clampText = (value: string | null, max: number) => value?.trim().slice(0, max) || null;
const clampNumber = (value: number | null, max: number) =>
  value !== null && value >= 1 && value <= max ? value : null;

// Ajusta o resultado da IA aos limites do formulário (tamanhos, números válidos, linhas vazias)
function toDraft(result: ExtractedRecipe) {
  return {
    name: result.name.trim().slice(0, 120),
    description: clampText(result.description, 500),
    category: result.category,
    prepMinutes: clampNumber(result.prepMinutes, 10_000),
    servings: clampNumber(result.servings, 1_000),
    difficulty: result.difficulty,
    sourceText: clampText(result.rawText, 20_000),
    ingredients: result.ingredients
      .filter((ingredient) => ingredient.item.trim())
      .slice(0, 100)
      .map((ingredient) => ({
        quantity: clampText(ingredient.quantity, 30),
        unit: clampText(ingredient.unit, 40),
        item: ingredient.item.trim().slice(0, 150),
      })),
    steps: result.steps
      .map((step) => step.trim().slice(0, 2_000))
      .filter(Boolean)
      .slice(0, 100),
  };
}

interface ImportRequest {
  userId: string;
  type: "IMAGE" | "PDF" | "TEXT";
  hash: string;
  source: RecipeSource;
  // Salva o arquivo só quando a IA realmente vai ser usada
  saveSourceFile?: () => Promise<string>;
}

class ImportLimitError extends Error {}

async function runImport({ userId, type, hash, source, saveSourceFile }: ImportRequest) {
  // 1. Mesmo conteúdo já lido antes? Reaproveita o resultado sem chamar a IA
  const cached = await prisma.recipeImport.findFirst({
    where: { fileHash: hash, status: "DONE" },
    orderBy: { createdAt: "desc" },
    select: { aiResult: true, fileUrl: true },
  });
  const cachedResult = cached && extractedRecipeSchema.safeParse(cached.aiResult);

  if (cached && cachedResult?.success) {
    const record = await prisma.recipeImport.create({
      data: {
        userId,
        type,
        fileHash: hash,
        fileUrl: cached.fileUrl,
        status: "DONE",
        fromCache: true,
        aiResult: cachedResult.data,
        aiWarnings: cachedResult.data.warnings,
      },
      select: { id: true, fileUrl: true },
    });
    return { record, result: cachedResult.data, fromCache: true };
  }

  // 2. Limite mensal
  const usage = await getUsage(userId);
  if (usage.remaining <= 0) throw new ImportLimitError();

  // 3. Registra a importação e chama a IA
  const fileUrl = saveSourceFile ? await saveSourceFile() : null;
  const record = await prisma.recipeImport.create({
    data: { userId, type, fileHash: hash, fileUrl },
    select: { id: true, fileUrl: true },
  });

  try {
    const result = await getAIProvider().extractRecipe(source);
    await prisma.recipeImport.update({
      where: { id: record.id },
      data: { status: "DONE", aiResult: result, aiWarnings: result.warnings },
    });
    return { record, result, fromCache: false };
  } catch (error) {
    await prisma.recipeImport.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        // Guarda o erro original (do provedor), mais útil para investigar do que a mensagem amigável
        error: String((error instanceof Error && error.cause) || error).slice(0, 2_000),
      },
    });
    throw error;
  }
}

export async function importRoutes(app: FastifyInstance) {
  app.get("/imports/usage", { onRequest: [app.authenticate] }, async (request) => {
    return getUsage(request.user.sub);
  });

  async function respond(request: ImportRequest, reply: FastifyReply) {
    let outcome;
    try {
      outcome = await runImport(request);
    } catch (error) {
      if (error instanceof ImportLimitError) {
        return reply.status(429).send({
          message: `Você usou as ${env.IMPORT_MONTHLY_LIMIT} leituras com IA deste mês. O limite renova no dia 1º.`,
        });
      }
      throw error;
    }

    const { record, result, fromCache } = outcome;
    const draft = toDraft(result);
    const usage = await getUsage(request.userId);

    if (!draft.name && draft.ingredients.length === 0 && draft.steps.length === 0) {
      return reply.status(422).send({
        message: "Não encontramos uma receita aqui. Tente uma foto mais nítida ou outro arquivo.",
        warnings: result.warnings,
        usage,
      });
    }

    return {
      import: { id: record.id, fileUrl: record.fileUrl, type: request.type, fromCache },
      recipe: draft,
      warnings: result.warnings,
      usage,
    };
  }

  // Lê uma foto ou PDF de receita
  app.post("/imports/file", { onRequest: [app.authenticate], config: importRateLimit }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ message: "Nenhum arquivo enviado" });

    let data: Buffer;
    try {
      data = await file.toBuffer();
    } catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        return reply.status(413).send({ message: `O arquivo pode ter no máximo ${MAX_IMPORT_MB} MB` });
      }
      throw error;
    }

    const detected = detectImportFileType(data);
    if (!detected) {
      return reply.status(415).send({ message: "Envie uma foto (JPG, PNG ou WEBP) ou um PDF" });
    }

    return respond(
      {
        userId: request.user.sub,
        type: detected.type,
        hash: sha256(data),
        source: { kind: "file", data, mimeType: detected.mimeType },
        saveSourceFile: () => saveFile(data, detected.extension),
      },
      reply,
    );
  });

  // Reorganiza um texto de receita (ex: o texto lido pela IA depois de corrigido pelo usuário)
  app.post("/imports/text", { onRequest: [app.authenticate], config: importRateLimit }, async (request, reply) => {
    const { text } = textSchema.parse(request.body);
    return respond(
      { userId: request.user.sub, type: "TEXT", hash: sha256(`text:${text}`), source: { kind: "text", text } },
      reply,
    );
  });
}
