import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export const AUTH_COOKIE = "rl_token";

const SESSION_DAYS = 7;

// O token fica num cookie httpOnly: o JavaScript da página não consegue lê-lo,
// o que protege contra roubo de sessão caso algum script malicioso rode no site.
const authCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * SESSION_DAYS,
} as const;

export function setupAuth(app: FastifyInstance) {
  app.register(fastifyCookie);
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
    sign: { expiresIn: `${SESSION_DAYS}d` },
  });

  // Use em rotas que exigem login: { onRequest: [app.authenticate] }
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Faça login para continuar" });
    }
  });
}

export async function startSession(reply: FastifyReply, userId: string) {
  const token = await reply.jwtSign({ sub: userId });
  reply.setCookie(AUTH_COOKIE, token, authCookieOptions);
}

export function endSession(reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE, { path: "/" });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
