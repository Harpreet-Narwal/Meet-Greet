# CLAUDE.md — Working Agreement for the Mulaqat Build

You are building **Mulaqat** from `IMPLEMENTATION_PLAN.md`. That plan is the source of truth for *what* to build; this file is *how* to work. `plan-1-social-dining-app.md` is product background — consult it for tone, copy, and intent, not for tech decisions (the implementation plan supersedes its stack suggestions).

## Prime directives

1. **Follow the milestones in order (M0 → M7).** Do not start a milestone until the previous one's acceptance criteria pass. Do not skip ahead "to save time."
2. **Never lower a quality gate.** Eval thresholds (≥ 0.90), test coverage of critical invariants, and Lighthouse targets are fixed. If you can't hit one, fix the system and if truly blocked, record the blocker in `PROGRESS.md` and stop — do not weaken the gate.
3. **Configuration over code for all AI choices.** Model names, providers, vector store, embedder, dims — env-driven only. If you find yourself writing a model name in a `.py`/`.ts` file, stop and move it to config. CI-only pinned models belong in the workflow yaml, nowhere else.
4. **The stack must always boot.** `make up && make seed && make test` from a clean clone must be green at the end of every milestone. The ai service must boot and serve `/health` even when `LLM_MODEL` is unset.
5. **Service boundaries are law.** web = UI/SEO only; api = all business logic + DB writes; ai = matching/embeddings/RAG only; terraform imports nothing from app code.

## Progress protocol

Maintain `PROGRESS.md` at repo root:

```markdown
## M2 — Events, booking & payments   [IN PROGRESS]
- [x] events CRUD + admin
- [x] booking transaction + race test
- [ ] waitlist promotion job
### Decisions
- Used ISR revalidate=300 on event pages (plan §8)
### Blockers
- none
```

Update it every working session. It is the handoff document if the session ends mid-milestone — a fresh session must be able to resume from it alone.

## Git conventions

- Conventional commits: `feat(api): booking capacity transaction`, `fix(web): quiz resume state`, `chore(ci): …`, `infra(tf): …`.
- One milestone = one branch (`m2-events-booking`) unless told otherwise. Small, reviewable commits; never commit secrets, `.env`, or generated artifacts.

## Code standards

- **TypeScript:** strict mode, no `any` without a comment justifying it, Zod at every API boundary, no business logic in React components (hooks/services).
- **Python:** type hints everywhere, `ruff` + `mypy` clean, pydantic models at every boundary, pure functions for matching math (side-effect-free, seeded randomness only).
- **Tests are part of the feature**, not a follow-up. The critical invariants get explicit named tests: booking oversell race, spark privacy (one-sided spark invisible in EVERY response shape), matching hard constraints, chat expiry, Plus gating server-side.
- **Copy matters.** No lorem ipsum, no "Submit" buttons, no robotic empty states. Warm, Indian-flavored, concise. When in doubt, check the product plan's voice.
- **Design tokens only** — no raw hex values in components; everything through `packages/ui` tokens. Dark mode is not optional.

## When something is ambiguous

Choose the option that (a) keeps scope inside v1, (b) is reversible, (c) matches an existing pattern in the repo — then record the decision in `PROGRESS.md` under "Decisions". Only stop and ask when the choice is irreversible or contradicts the plan.

## Verification habits

- After any api change: run its e2e suite, and regenerate the typed client (`pnpm gen:client`) so web compiles against reality.
- After any ai change: `make eval` (matching suite locally always; retrieval/generation suites if Ollama models are pulled).
- After any web change touching public pages: run the Lighthouse CI script.
- Before declaring a milestone done: clean-clone simulation — `git stash -u && make down -v && make up && make seed && make test`.

## Things you must never do

- Ship a one-sided Spark that is visible to the recipient in any payload, log, or UI state.
- Charge for or paywall any safety feature.
- Add a swipe-on-strangers mechanic. Connections only between people who attended the same event.
- Hardcode an LLM/embedding model name in application code.
- Commit real payment/SMS provider keys or wire a real provider without being asked.
- Silently change stack choices (NestJS, Qdrant default, Prisma). Friction → note in PROGRESS.md.
