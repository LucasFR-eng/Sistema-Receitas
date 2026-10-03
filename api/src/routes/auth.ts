import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { endSession, startSession } from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

// Campos do usuário que podem ser enviados ao front (nunca o hash da senha)
const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().regex(/^[a-z0-9_]{3,20}$/, "Use de 3 a 20 caracteres: letras, números ou _")),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa"),
});

const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().min(1, "Informe seu e-mail ou usuário")),
  password: z.string().min(1, "Informe sua senha"),
});

// Limita tentativas para dificultar quem tenta adivinhar senhas
const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

// Hash usado quando o usuário não existe, para o login levar o mesmo tempo
// nos dois casos e não revelar quais e-mails estão cadastrados
const dummyPasswordHash = await hashPassword("senha-inexistente");

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", { config: authRateLimit }, async (request, reply) => {
    const data = registerSchema.parse(request.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      const fieldErrors: Record<string, string[]> = {};
      if (existing.email === data.email) fieldErrors.email = ["Este e-mail já está cadastrado"];
      if (existing.username === data.username) {
        fieldErrors.username = ["Este nome de usuário já está em uso"];
      }
      return reply.status(409).send({ message: "Não foi possível criar a conta", fieldErrors });
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        passwordHash: await hashPassword(data.password),
      },
      select: publicUserSelect,
    });

    await startSession(reply, user.id);
    return reply.status(201).send({ user });
  });

  app.post("/auth/login", { config: authRateLimit }, async (request, reply) => {
    const { login, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
      select: { ...publicUserSelect, passwordHash: true },
    });

    const valid = await verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);

    if (!user || !valid) {
      return reply.status(401).send({ message: "E-mail, usuário ou senha incorretos" });
    }

    const { passwordHash: _, ...publicUser } = user;
    await startSession(reply, user.id);
    return { user: publicUser };
  });

  app.post("/auth/logout", async (_request, reply) => {
    endSession(reply);
    return reply.status(204).send();
  });

  // Devolve o usuário logado, ou user: null se não houver sessão válida
  app.get("/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return { user: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: publicUserSelect,
    });

    if (!user) endSession(reply);
    return { user };
  });
}
