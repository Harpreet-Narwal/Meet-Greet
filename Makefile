SHELL := /bin/bash
.DEFAULT_GOAL := help

# Read a var from .env, stripping inline comments/whitespace: $(call envvar,NAME)
envvar = $$(grep -E '^$(1)=' .env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/\#.*//' | xargs)

.PHONY: help up down down-v logs seed test eval models

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Boot the full local stack (creates .env from .env.example on first run)
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example — set LLM_MODEL/EMBEDDING_MODEL when ready")
	docker compose up -d --build
	@echo ""
	@echo "  web    → http://localhost:3000"
	@echo "  api    → http://localhost:4000/docs"
	@echo "  ai     → http://localhost:8000/health"
	@echo "  mail   → http://localhost:8025"
	@echo "  minio  → http://localhost:9001"

down: ## Stop the stack (keeps volumes)
	docker compose down --remove-orphans

down-v: ## Stop the stack and wipe volumes (clean-slate)
	docker compose down --remove-orphans -v

logs: ## Tail all service logs
	docker compose logs -f --tail=100

seed: ## Migrate + seed the database, then ingest decks into the vector store (skips gracefully if EMBEDDING_MODEL unset)
	docker compose exec api sh -c "pnpm --filter @mulaqat/api db:deploy && pnpm --filter @mulaqat/api db:seed"
	@TOKEN=$(call envvar,INTERNAL_API_TOKEN); \
	curl -sf -X POST http://localhost:8000/decks/ingest \
		-H "Authorization: Bearer $${TOKEN:-dev-internal-token-change-me}" \
		-H "Content-Type: application/json" -d '{}' || echo "deck ingestion skipped (ai service not ready)"
	@echo ""

test: ## Run every workspace's tests (installs deps if needed)
	pnpm install --frozen-lockfile
	pnpm turbo run lint typecheck test
	pnpm --filter @mulaqat/api test:e2e
	cd services/ai && uv sync --frozen && uv run ruff check . && uv run mypy app evals && uv run pytest -q

eval: ## Run the AI eval suites (matching always; retrieval/generation need Ollama models pulled)
	cd services/ai && uv sync --frozen && uv run python -m evals.run --suite all

models: ## Pull the Ollama models configured in .env
	@LLM=$(call envvar,LLM_MODEL); \
	if [ -n "$$LLM" ]; then docker compose exec ollama ollama pull "$$LLM"; else echo "LLM_MODEL not set in .env — skipping"; fi
	@EMB=$(call envvar,EMBEDDING_MODEL); \
	if [ -n "$$EMB" ]; then docker compose exec ollama ollama pull "$$EMB"; else echo "EMBEDDING_MODEL not set in .env — skipping"; fi
