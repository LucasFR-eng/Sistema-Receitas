import "dotenv/config";
import { z } from "zod";

// Valida as variáveis de ambiente na inicialização.
// Se algo obrigatório estiver faltando, a API nem sobe e mostra o erro.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3333),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres"),
  UPLOAD_DIR: z.string().default("./uploads"),
  // Produção (Vercel): Vercel Blob para guardar fotos e PDFs. Sem nenhum dos dois, usa a pasta UPLOAD_DIR.
  // Projetos novos recebem BLOB_STORE_ID (autenticação automática OIDC); os antigos, BLOB_READ_WRITE_TOKEN
  BLOB_STORE_ID: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Produção (Vercel): Redis para os avisos em tempo real chegarem a todas as cópias da API.
  // A integração do Upstash na Vercel cria REDIS_URL (ou KV_URL). Sem ele, os avisos ficam em memória
  REDIS_URL: z.string().optional(),
  KV_URL: z.string().optional(),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  // Opcional para a API subir sem IA; só é exigida quando a IA for usada
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  // Modelos reserva separados por vírgula, usados quando o principal está sobrecarregado
  GEMINI_FALLBACK_MODELS: z
    .string()
    .default("gemini-3.5-flash")
    .transform((value) =>
      value
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
    ),
  // Quantas leituras com IA cada usuário pode fazer por mês (reaproveitamentos não contam)
  IMPORT_MONTHLY_LIMIT: z.coerce.number().int().min(0).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
