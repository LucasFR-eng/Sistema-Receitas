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
