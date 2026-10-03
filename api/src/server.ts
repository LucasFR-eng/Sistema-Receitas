import { buildApp } from "./create-app.js";
import { env } from "./env.js";

const app = buildApp();

// Sem "await" no topo do arquivo: na Vercel, a plataforma só começa a repassar requisições
// depois que este arquivo termina de carregar. Esperar o listen aqui travava a API para sempre.
app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
