# Deploy na Vercel (gratuito)

O Receita+ vira **um único projeto na Vercel** usando o recurso **Services**:

| Serviço | Pasta | Endereço |
|---|---|---|
| `web` (React + Vite) | `web/` | tudo que não começa com `/api` |
| `api` (Fastify) | `api/` | `/api/...` |

Essa divisão está no [vercel.json](vercel.json) da raiz. Como site e API dividem o mesmo endereço,
o cookie de login funciona em todos os navegadores.

Serviços gratuitos ligados ao projeto pelo painel da Vercel:

| Serviço | Para quê | Variável que cria |
|---|---|---|
| **Supabase** (Postgres) | Banco de dados | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (cadastradas à mão, veja o passo 2) |
| **Vercel Blob** (acesso **Public**) | Fotos e PDFs | `BLOB_STORE_ID` (autenticação automática OIDC) |
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

**Banco (Supabase):**

1. Em https://supabase.com crie um projeto no plano **Free**, região **South America (São Paulo)**, e guarde a senha do banco
2. No projeto, botão **Connect** → copie duas conexões (troque `[YOUR-PASSWORD]` pela senha):
   - **Transaction pooler** (porta `6543`) → na Vercel, variável `DATABASE_URL`, com `?sslmode=no-verify` no final.
     É a que o app usa. `no-verify` mantém a conexão criptografada; sem ele a biblioteca `pg` recusa o certificado do Supabase
   - **Session pooler** (porta `5432`) → na Vercel, variável `DATABASE_URL_UNPOOLED`, com `?sslmode=require` no final.
     É a que as migrações usam. Não use a "Direct connection": no plano Free ela só aceita IPv6, e a Vercel não conecta por IPv6
3. Cadastre as duas em **Settings → Environment Variables** (Production e Preview)

> No plano Free, o Supabase **pausa o projeto depois de 7 dias sem nenhum acesso**. Para reativar: painel do Supabase → **Restore project**.

**Arquivos e Redis**, na aba **Storage** (ou **Integrations / Marketplace**):

1. **Blob** → crie um store com acesso **Public** (as fotos precisam abrir para qualquer visitante) → conecte ao projeto
2. **Upstash for Redis** → plano **Free** → conecte ao projeto

Essas integrações criam as variáveis sozinhas.

## 3. Publicar de novo

Aba **Deployments** → no último deploy, **Redeploy**. O build da API roda `prisma migrate deploy`
e cria as tabelas no Supabase.

Teste: `https://SEU-DOMINIO.vercel.app/api/health` deve mostrar `{"status":"ok","database":"ok"}`
(o domínio aparece em **Domains** no painel; se o nome já existir, a Vercel acrescenta um sufixo).
Depois abra `https://SEU-DOMINIO.vercel.app`.

## Atualizações

Cada `git push` na branch `main` publica de novo, sozinho.
Migrações novas do banco rodam automaticamente no deploy.

## Limites que já estão tratados no código

- **Envios de até 4,5 MB:** fotos são reduzidas no navegador; PDFs até 4 MB
- **Funções de até 5 minutos no plano Hobby:** o feed e os comentários ao vivo reconectam sozinhos; a leitura com IA desiste em 100 segundos
- **Várias cópias da API:** os avisos em tempo real passam pelo Redis (Upstash)
