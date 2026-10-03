# Deploy na Vercel (gratuito)

O RecipeLens vira **um único projeto na Vercel** usando o recurso **Services**:

| Serviço | Pasta | Endereço |
|---|---|---|
| `web` (React + Vite) | `web/` | tudo que não começa com `/api` |
| `api` (Fastify) | `api/` | `/api/...` |

Essa divisão está no [vercel.json](vercel.json) da raiz. Como site e API dividem o mesmo endereço,
o cookie de login funciona em todos os navegadores.

Serviços gratuitos ligados ao projeto pelo painel da Vercel:

| Serviço | Para quê | Variável que cria |
|---|---|---|
| **Neon** (Postgres) | Banco de dados | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| **Vercel Blob** | Fotos e PDFs | `BLOB_READ_WRITE_TOKEN` |
| **Upstash** (Redis) | Avisos em tempo real entre as cópias da API | `REDIS_URL` (ou `KV_URL`) |

> O plano gratuito (Hobby) da Vercel **não permite uso comercial**. Quando começar a cobrar, migre para o plano Pro ou outra hospedagem.

## 1. Criar o projeto

1. Em https://vercel.com/new, importe o repositório **Sistema-Receitas**
2. **Project Name:** `recipelens`
3. **Root Directory:** deixe `./` (a raiz)
4. **Application Preset:** **Services**. A Vercel lê o `vercel.json` e mostra `api` em `/api` e `web` em `/`.
5. **Environment Variables:**
   - `JWT_SECRET`: um valor novo, longo e aleatório (não use o do seu computador). Para gerar:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `GEMINI_API_KEY`: sua chave do Google AI Studio
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `GEMINI_FALLBACK_MODELS`: `gemini-3.5-flash`
6. Clique em **Deploy**. O primeiro deploy vai falhar por falta de banco, e está tudo bem.

## 2. Ligar banco, arquivos e Redis

No projeto, aba **Storage** (ou **Integrations / Marketplace**):

1. **Neon** (Postgres) → plano **Free** → conecte ao projeto `recipelens`
2. **Blob** → crie um store → conecte ao projeto
3. **Upstash for Redis** → plano **Free** → conecte ao projeto

Cada integração cria as variáveis sozinha.

## 3. Publicar de novo

Aba **Deployments** → no último deploy, **Redeploy**. O build da API roda `prisma migrate deploy`
e cria as tabelas no Neon.

Teste: `https://recipelens.vercel.app/api/health` deve mostrar `{"status":"ok","database":"ok"}`.
Depois abra `https://recipelens.vercel.app`.

## Atualizações

Cada `git push` na branch `main` publica de novo, sozinho.
Migrações novas do banco rodam automaticamente no deploy.

## Limites que já estão tratados no código

- **Envios de até 4,5 MB:** fotos são reduzidas no navegador; PDFs até 4 MB
- **Funções de até 5 minutos no plano Hobby:** o feed e os comentários ao vivo reconectam sozinhos; a leitura com IA desiste em 100 segundos
- **Várias cópias da API:** os avisos em tempo real passam pelo Redis (Upstash)
