# Mulaqat — Progress

## M0 — Scaffold & pipelines   [IN PROGRESS]
- [x] monorepo tooling (pnpm + turbo + root scripts)
- [x] docker compose stack + Makefile + .env.example
- [x] packages/ui tokens + base components, packages/types, packages/config
- [x] services/ai boots `/health` (works with LLM_MODEL unset) — ruff/mypy/pytest green (12 tests)
- [x] services/api `/health` + `/ready` + `/docs`, full Prisma schema (§5) + migrations + seed skeleton
- [x] apps/web builds statically with brand landing, logos wired from assets/
- [x] infra/terraform isolated skeleton — fmt clean, `validate` green for dev+prod
- [x] CI workflows (web/api/ai/terraform/evals/release)
- [ ] `make up && make seed && make test` green from clean clone  ← verifying now

### Decisions
- **UUID v7 PKs**: Postgres 16 has no native `uuidv7()`, so the base migration
  (`00000000000000_base_extensions`) defines `uuid_generate_v7()` in plpgsql; all PKs use
  `dbgenerated`. Verified: seeded ids carry the version-7 nibble.
- **`bookings.payment_id` dropped** from the schema — the `payments.booking_id` FK covers the
  relation; keeping both invites drift (plan §5 listed both directions).
- **User profile fields nullable** (name/dob/gender/city/dietary): users are created at first
  OTP verify with only a phone; onboarding (M1) fills the rest.
- **Web CI smoke for M0** is `next start` + curl (landing + /health) — the Playwright
  booking-happy-path smoke replaces it in M2 when booking exists (plan §9.2 target intact).
- **Eval runner exists from M0** (`python -m evals.run`): suites register as they land
  (matching M3, retrieval/generation M6); an implemented suite scoring < 0.90 exits non-zero.
  Runner currently reports "not implemented yet" — no gate is faked green.
- **ESLint**: flat-config base shared via `@mulaqat/config` (no-explicit-any = error per
  CLAUDE.md). Web uses the same base; `eslint-config-next` can layer on in M1 if wanted.
- **Compose dev volumes**: only `apps/web` is bind-mounted for HMR (with anonymous volumes
  shielding node_modules/.next). api/ai rebuild on change — revisit in M4 if it drags.
- **Terraform secrets module**: `for_each` over a sensitive map is invalid in TF —
  iterate `nonsensitive(var.parameters)` (keys are env-var names), values wrapped `sensitive()`.
- **terraform plan/apply in CI degrade gracefully**: when AWS secrets are absent the jobs
  log "skipped" instead of failing — fmt/validate/tflint still gate every PR.
- **prod compose override** disables ollama/mailhog via `deploy.replicas: 0` — prod uses a
  hosted LLM API through env (plan §9.3).

### Blockers
- none
