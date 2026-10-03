# Deploy na Vercel (gratuito)

O RecipeLens vira **dois projetos na Vercel**, apontando para o mesmo repositório do GitHub:

| Projeto | Pasta (Root Directory) | O que é |
|---|---|---|
| `recipelens-api` | `api` | A API (Fastify), rodando como Vercel Function |
| `recipelens` | `web` | O site (React). Repassa `/api/*` para o projeto da API |

Serviços gratuitos ligados ao projeto da API pelo painel da Vercel:

| Serviço | Para quê | Variável que cria |
|---|---|---|
| **Neon** (Postgres) | Banco de dados | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| **Vercel Blob** | Fotos e PDFs | `BLOB_READ_WRITE_TOKEN` |
| **Upstash** (Redis) | Avisos em tempo real entre as cópias da API | `REDIS_URL` (ou `KV_URL`) |

> O plano gratuito (Hobby) da Vercel **não permite uso comercial**. Quando começar a cobrar, migre para o plano Pro ou outra hospedagem.

## 1. Projeto da API

1. Em https://vercel.com/new, importe o repositório do GitHub
2. **Project Name:** `recipelens-api`
3. **Root Directory:** `api`
4. **Environment Variables:**
   - `JWT_SECRET`: um valor novo, longo e aleatório (não use o do seu computador). Para gerar:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `GEMINI_API_KEY`: sua chave do Google AI Studio
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `GEMINI_FALLBACK_MODELS`: `gemini-3.5-flash`
   - `WEB_ORIGIN`: o endereço do site, ex: `https://recipelens.vercel.app`
5. Clique em **Deploy**. O primeiro deploy vai falhar por falta de banco, e está tudo bem.
6. No projeto, aba **Storage**:
   - **Create Database → Neon** (plano Free) → conecte ao projeto
   - **Create → Blob** → conecte ao projeto
   - **Marketplace → Upstash for Redis** (plano Free) → conecte ao projeto
7. Aba **Deployments** → no último deploy, **Redeploy**. O build roda `prisma migrate deploy` e cria as tabelas no Neon.
8. Teste: abra `https://recipelens-api.vercel.app/health`. Deve aparecer `{"status":"ok","database":"ok"}`.

## 2. Projeto do site

1. Em https://vercel.com/new, importe **o mesmo repositório** de novo
2. **Project Name:** `recipelens`
3. **Root Directory:** `web` (a Vercel detecta o Vite sozinha)
4. Confira o endereço da API em `web/vercel.json`. Se o projeto da API ganhou outro nome
   (ex: `recipelens-api-abc.vercel.app`), troque lá, faça commit e push.
5. Clique em **Deploy**

Pronto: o site fica em `https://recipelens.vercel.app` (ou no nome que a Vercel der).

## Atualizações

Cada `git push` na branch `main` publica as duas partes de novo, sozinho.
Migrações novas do banco rodam automaticamente no deploy da API.

## Limites que já estão tratados no código

- **Envios de até 4,5 MB:** fotos são reduzidas no navegador; PDFs até 4 MB
- **Conexões de até 2 minutos pelo repasse do `/api`:** o feed e os comentários ao vivo reconectam sozinhos; a leitura com IA desiste em 100 segundos
- **Várias cópias da API:** os avisos em tempo real passam pelo Redis (Upstash)
