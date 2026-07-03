# 01 Setup

> Local setup, LM Studio configuration, ngrok routing, and validation flow for this demo.

## Runtime Requirements

- Node.js `>=22` (`package.json` engines field).
- `pnpm` package manager.
- Agora project credentials (`NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`).
- LM Studio or another OpenAI-compatible local model server.
- `ngrok` if you want the live Agora agent to reach your local model through the public proxy route.

## Install and Bootstrap

1. Install dependencies.
2. Copy `.env.example` to `.env.local`.
3. Configure Agora and Gemma env vars.
4. Start LM Studio.
5. Start the app.
6. Open ngrok for the public proxy route.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
ngrok http 3000
```

## Required Environment Variables

- `NEXT_PUBLIC_AGORA_APP_ID`: Agora project App ID.
- `NEXT_AGORA_APP_CERTIFICATE`: Agora App Certificate, server only.

Gemma variables:

- `GEMMA_BASE_URL`: local model server base URL.
- `GEMMA_CHAT_URL`: local LM Studio chat endpoint, if needed.
- `GEMMA_MODEL`: exact model identifier from LM Studio or Ollama.
- `GEMMA_TIMEOUT_MS`: request timeout in milliseconds.

Optional:

- `NEXT_PUBLIC_AGENT_UID` defaults to `123456`.
- `NEXT_AGENT_GREETING`.
- `GEMMA_PUBLIC_CHAT_URL`: public URL that points to the Next.js `/api/chat/completions` proxy route.

## Primary Commands

```bash
pnpm dev
pnpm run lint
pnpm run typecheck
pnpm run build
```

## Verification Safety

Safe without a live Agora session:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`

Requires working Agora credentials and a running model server:

- `/api/gemma/test`
- `/api/gemma/chat`
- `/api/chat/completions`

## Local Run Notes

- App + API routes run at `http://localhost:3000`.
- `Check Local Gemma` validates the local model before starting the voice flow.
- `Start Conversation` bootstraps token minting, RTM login, and managed agent invite.
- If the agent cannot reach your local model, verify `GEMMA_PUBLIC_CHAT_URL` points at the public ngrok URL for the Next.js proxy route.

## CI Expectations

- Pre-ship expectation: `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` pass.
- Live voice validation still depends on Agora credentials and a reachable Gemma endpoint.

## Troubleshooting Matrix

| Symptom | Probable Cause | First Check | Fix Path |
| --- | --- | --- | --- |
| Local Gemma test fails | LM Studio or Ollama not running | `/api/gemma/test` | Start the local model server and verify the port |
| Agent says it cannot reach the model | `GEMMA_PUBLIC_CHAT_URL` missing or private | `app/api/invite-agent/route.ts` | Set `GEMMA_PUBLIC_CHAT_URL` to the ngrok URL for `/api/chat/completions` |
| Transcript missing | RTM token or invite flow failed | Browser console and `/api/invite-agent` | Verify Agora credentials and channel bootstrap |
| Mic publishes but no response | Agent start failed | UI status chips | Check the invite route and public Gemma proxy |

## Local-Only vs Deploy-Specific

Local:

- Uses `.env.local` with LM Studio or Ollama settings.
- Uses `pnpm dev`.
- Best for voice-flow debugging and model verification.

Deploy/public tunnel:

- `GEMMA_PUBLIC_CHAT_URL` must point at a public URL for the Next.js proxy route.
- The proxy route then calls the local model server on your machine.
- Keep `NEXT_AGORA_APP_CERTIFICATE` private server-side.

## Setup Change Checklist

When setup docs/config change:

1. Update `README.md` and `DEMO_SCRIPT.md`.
2. Update `.env.example` if the variable set changes.
3. Update `docs/ai/L1/01_setup.md` and `L0_repo_card.md`.
4. Run at least `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build`.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Full start/join/teardown sequence.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — RTM transcript/event pipeline internals.
