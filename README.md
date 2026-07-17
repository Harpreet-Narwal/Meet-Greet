# Mulaqat

**Six strangers. One table. Zero small talk (eventually).**

Mulaqat is a personality-matched social events platform for Indian metros: take a 5-minute
personality quiz, get matched into a curated table of six for a dinner / run club / game night,
play built-in ice-breaker games at the table, and connect — or Spark — only with people you've
actually met.

## Monorepo layout

| Workspace | Stack | Owns |
|---|---|---|
| [apps/web](apps/web/) | Next.js 15, Tailwind 4 | UI, SEO pages, session handling |
| [services/api](services/api/) | NestJS 10, Prisma, Postgres | All business logic, payments, sockets, jobs |
| [services/ai](services/ai/) | FastAPI, Python 3.12 | Matching, profiling, embeddings, RAG, evals |
| [packages/ui](packages/ui/) | React + design tokens | Shared components & brand tokens |
| [packages/types](packages/types/) | TypeScript | Shared types + generated API client |
| [infra/terraform](infra/terraform/) | Terraform (AWS) | Isolated infra workspace, own pipeline |

## Quickstart (one command)

Prereqs: Docker Desktop, Node 22, pnpm 9, [uv](https://docs.astral.sh/uv/).

```bash
make up      # boots web :3000, api :4000, ai :8000 + postgres/redis/qdrant/ollama/minio/mailhog
make seed    # migrate + seed the database
make test    # every workspace's lint/typecheck/tests
```

`make up` creates `.env` from `.env.example` on first run. The stack boots **without** any
LLM configured — matching is deterministic math. When you want generation features:

```bash
# in .env: set LLM_MODEL (e.g. llama3.1:8b) and EMBEDDING_MODEL (e.g. nomic-embed-text)
make models  # pulls them into the ollama container
make eval    # all eval suites must score ≥ 0.90
```

Dev conveniences: OTP login accepts `000000`, payments auto-succeed (mock provider),
emails land in Mailhog at http://localhost:8025, photos go to MinIO.

## Working on it

- `IMPLEMENTATION_PLAN.md` — the master engineering plan (milestones M0–M7)
- `CLAUDE.md` — working agreement, quality gates, conventions
- `PROGRESS.md` — live milestone status & decisions
- `docs/seed-content.md` — quiz + game deck seed data (loaded verbatim)

All AI choices (provider, models, vector store) are **env-driven — never code**. See `.env.example`.
