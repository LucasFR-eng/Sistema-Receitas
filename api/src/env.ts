import "dotenv/config";
import { z } from "zod";

// Valida as variáveis de ambiente na inicialização.
// Se algo obrigatório estiver faltando, a API nem sobe e mostra o erro.
const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  UPLOAD_DIR: z.string().default("./uploads"),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  // Opcional para a API subir sem IA; só é exigida quando a IA for usada
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
