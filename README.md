# RecipeLens

Fotografe uma receita (ou envie um PDF) e a IA escreve para você. Organize suas receitas, deixe-as públicas ou privadas e descubra as de outras pessoas em tempo real.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | React + TypeScript + Vite + Tailwind CSS (`web/`) |
| Back-end | Node.js + TypeScript + Fastify (`api/`) |
| Banco | PostgreSQL + Prisma |
| IA | Gemini (isolado em `api/src/ai/`, troca fácil de fornecedor) |
| Infra | Docker Compose |

## Pré-requisitos

- Node.js 24+
- Docker Desktop (aberto e rodando)

## Como rodar em desenvolvimento

### Jeito rápido (um terminal só)

Com o Docker Desktop aberto, na pasta raiz do projeto:

```bash
npm run setup   # só na primeira vez: instala as dependências da raiz, da API e do front
npm run dev     # sobe o banco, a API e o front juntos
```

Acesse http://localhost:5173. Para parar tudo, aperte `Ctrl + C`.

Na primeira vez, configure também o `api/.env` (veja o passo 2 abaixo) e crie as tabelas com `npm --prefix api run db:migrate`.

### Passo a passo (cada parte num terminal)

**1. Suba o banco de dados**

```bash
docker compose up -d db
```

O Postgres fica na porta **5433** (a 5432 já é usada por um Postgres instalado no Windows).

**2. Configure e rode a API**

```bash
cd api
npm install
cp .env.example .env      # depois coloque sua GEMINI_API_KEY no .env
npm run db:migrate        # cria as tabelas no banco
npm run dev
```

A API roda em http://localhost:3333. Teste em http://localhost:3333/health.

**3. Rode o front** (em outro terminal)

```bash
cd web
npm install
npm run dev
```

Acesse http://localhost:5173.

## Importação com IA

Em **Nova receita → Importar com IA**, o usuário envia uma foto ou PDF e o Gemini preenche o formulário, listando o que precisa ser revisado. O texto lido vai para "Anotações", onde dá para corrigir e clicar em **Reorganizar com IA**.

- Configure `GEMINI_API_KEY` no `api/.env` (gere em https://aistudio.google.com/apikey)
- `GEMINI_MODEL` é o modelo principal; `GEMINI_FALLBACK_MODELS` são usados se ele estiver sobrecarregado
- `IMPORT_MONTHLY_LIMIT` limita as leituras por usuário por mês
- Arquivo ou texto idêntico a um já lido reaproveita o resultado, sem chamar a IA e sem contar no limite
- Erros da IA ficam salvos na coluna `error` da tabela `recipe_imports` (veja com `npm --prefix api run db:studio`)

## Deploy

Veja o passo a passo para publicar de graça na Vercel em [DEPLOY.md](DEPLOY.md).

## Comandos úteis

| Comando (dentro de `api/`) | O que faz |
|---|---|
| `npm run db:migrate` | Cria uma migração após alterar `prisma/schema.prisma` |
| `npm run db:studio` | Abre uma interface visual para ver e editar o banco |
| `npm run typecheck` | Verifica erros de tipo |

## Rodar tudo no Docker (opcional)

```bash
docker compose --profile app up --build
```

Front em http://localhost:8080 e API em http://localhost:3333.

## Estrutura

```
recipelens/
├── docker-compose.yml
├── api/
│   ├── prisma/schema.prisma   # modelo do banco
│   └── src/
│       ├── ai/                # provedor de IA (Gemini) + prompts
│       ├── lib/               # conexão com o banco
│       ├── routes/            # rotas da API
│       ├── app.ts             # configuração do Fastify
│       └── server.ts          # ponto de entrada
└── web/
    └── src/
        ├── components/
        ├── lib/api.ts         # chamadas para a API
        └── App.tsx
```

## Roadmap

**Fase 1 (MVP):** cadastro e login, criar receita manualmente, importar por foto ou PDF com IA, revisão antes de publicar, receitas públicas e privadas, feed em tempo real, busca, perfil.

**Fase 2:** curtidas e favoritos, comentários, seguir usuários, coleções, ajuste de porções, modo cozinha, agente de IA com acesso às receitas.

**Fase 3:** "o que tenho na geladeira?", lista de compras, importar por link, informação nutricional, app mobile.
