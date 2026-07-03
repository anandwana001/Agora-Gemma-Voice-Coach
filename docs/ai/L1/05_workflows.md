# 05 Workflows

> Repeatable task recipes for setup, local model checks, live demo flow, and validation loops.

## Run Locally

1. `pnpm install`
2. Copy `.env.example` to `.env.local`
3. Set Agora credentials and Gemma/LM Studio env vars
4. Start LM Studio
5. `pnpm dev`
6. In a second terminal, run `ngrok http 3000`
7. Set `GEMMA_PUBLIC_CHAT_URL` to the ngrok URL plus `/api/chat/completions`

## Change Agent Behavior

Target file: `app/api/invite-agent/route.ts`.

Typical edits:

- System prompt from `lib/gemma-client.ts`.
- Greeting default (`NEXT_AGENT_GREETING`).
- VAD (`turnDetection.config.*`).
- STT/LLM/TTS model/provider blocks.

Validation path:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run build`

## Change Token or Session Bootstrap

Token behavior:

- Edit `app/api/generate-agora-token/route.ts`.
- Preserve RTM-capable token generation.

Bootstrap behavior:

- Edit `components/LandingPage.tsx`.
- Keep invite + RTM setup parallelized before conversation mount.

## Change Transcript Rendering

1. Update transforms in `lib/conversation.ts`.
2. Update wiring in `components/ConversationComponent.tsx`.
3. Ensure `IN_PROGRESS` is separated from history, `INTERRUPTED` retained in history.
4. Re-check [transcript_pipeline.md](L2/transcript_pipeline.md) for consistency.

## Ship-Readiness Workflow

1. Run `pnpm run lint`.
2. Run `pnpm run typecheck`.
3. Run `pnpm run build`.
4. Confirm docs alignment (`README`, `DEMO_SCRIPT.md`, `docs/ai`).
5. Use conventional commit and branch naming.

## Progressive Disclosure Doc Workflow

- `generate docs`: create `docs/ai/` tree when absent.
- `update docs`: refresh after workflow/interface/security changes.
- `test docs`: record repo-specific validation notes in `docs/ai/test-results.md`.
- `fix docs`: close findings from `docs/ai/test-results.md` or a docs review.

## Workflow: Implement a Baseline Recipe Repo

1. Treat this repo as the Agora x Gemma voice demo baseline.
2. Do not recreate Agora ConvoAI integration from memory.
3. Follow [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) for the implementation map and checklist.
4. Preserve the recipe invariants in `docs/ai/RECIPE.md`.
5. Run the verification commands before publishing a derivative.

## Workflow: Add a New API Route

1. Add route under `app/api/<route-name>/route.ts`.
2. Define payload types in `types/conversation.ts` if shared with client.
3. Add/update docs in `docs/ai/L1/06_interfaces.md`.
4. Run `pnpm run lint` and `pnpm run typecheck`.
5. Update `README.md` and `DEMO_SCRIPT.md`.

## Workflow: Modify Transcript UX

1. Update transforms in `lib/conversation.ts`.
2. Update render usage in transcript/layout components.
3. Validate edge states (`IN_PROGRESS`, `INTERRUPTED`, empty history).
4. Reconcile guidance in [transcript_pipeline.md](L2/transcript_pipeline.md).
5. Run `pnpm run lint` and `pnpm run build`.

## Workflow: Enable a Different Local Model

1. Update `GEMMA_BASE_URL`, `GEMMA_CHAT_URL`, and `GEMMA_MODEL`.
2. Keep `GEMMA_PUBLIC_CHAT_URL` pointed at the public Next.js proxy route.
3. Verify the model returns only the final answer, not reasoning traces.
4. Update README, demo script, and relevant docs.
5. Re-run local smoke tests before shipping.

## Workflow: Docs Refresh After Runtime Changes

1. Update L1 files matching the changed subsystem.
2. Update or add L2 deep dives if L1 explanation exceeds concise bounds.
3. Bump `Last Reviewed` in `L0_repo_card.md`.
4. Re-run the local docs sanity check and append retest notes for any fixes.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Full runtime sequence for bootstrap and teardown tasks.
- [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) — Baseline implementation checklist for recipe consumers.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Required checks when editing transcript flow.
