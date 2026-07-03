# Agora x Gemma Voice Coach

Agora x Gemma Voice Coach is a local Next.js demo that combines:

- Agora Conversational AI for the live voice session
- local Gemma for the reasoning layer
- transcript, status, and microphone controls for live demos

## What this demo does

- Starts an Agora RTC and RTM session for live microphone input.
- Invites a managed Agora Conversational AI agent to join the same channel.
- Streams transcript and call-state updates into the browser UI.
- Lets you test a local Gemma endpoint separately with `/api/gemma/test` and `/api/gemma/chat`.
- Uses Agora `CustomLLM` in the agent backend, pointing at the Gemma chat-completions endpoint.
- Exposes local Gemma test/chat routes so you can verify the model independently before joining a live session.

## What code was copied or adapted from the Agora quickstart

Source of truth:

- the reference Agora Next.js quickstart repo used during development

Copied or adapted from the reference repo:

- `app/api/generate-agora-token/route.ts` - RTC + RTM token minting with `buildTokenWithRtm`
- `app/api/invite-agent/route.ts` - managed agent session start and lifecycle config
- `app/api/stop-conversation/route.ts` - managed agent shutdown and idempotent cleanup
- `app/api/chat/completions/route.ts` - OpenAI-compatible adapter seam backed by local Gemma
- `components/LandingPage.tsx` - session bootstrap, Gemma check, and live demo shell
- `components/ConversationComponent.tsx` - RTC join, mic publish, voice lifecycle, transcript handling
- `components/QuickstartConversationLayout.tsx` - in-call layout shell
- `components/QuickstartTranscriptPanel.tsx` - live transcript rendering
- `components/QuickstartPipelineMetrics.tsx` - pipeline metric chips
- `components/ConnectionStatusPanel.tsx` - RTC and error status surface
- `components/ConversationErrorCard.tsx` - friendly call error display
- `components/MicrophoneSelector.tsx` - microphone device selection
- `components/ErrorBoundary.tsx` - conversation subtree guardrail
- `components/LoadingSkeleton.tsx` - loading fallback for the browser-only call UI
- `lib/agora.ts` - shared agent UID default
- `lib/conversation.ts` - transcript normalization and agent visualizer mapping
- `types/conversation.ts` - shared request/response contracts

## Local Gemma setup

This demo supports two local model modes:

- LM Studio with its local server
- Ollama

For your current LM Studio setup, use:

```bash
GEMMA_BASE_URL=http://localhost:12345
GEMMA_CHAT_URL=http://localhost:12345/api/v1/chat
GEMMA_MODEL=google/gemma-4-e2b
GEMMA_TIMEOUT_MS=30000
```

In LM Studio, make sure the model is downloaded and the local server is running. Set `GEMMA_MODEL` to the exact model identifier shown in LM Studio. The code now reads the final `message` output from LM Studio, not the reasoning block.

If you want the live Agora voice session to work from your laptop, tunnel the Next.js app, not the LM Studio port:

```bash
ngrok http 3000
```

Then set:

```bash
GEMMA_PUBLIC_CHAT_URL=https://your-ngrok-domain.ngrok-free.dev/api/chat/completions
```

Agora should call that public Next.js proxy route. The proxy route then calls your local LM Studio server.

If you want the Ollama path instead, run:

```bash
ollama pull gemma3:4b
ollama run gemma3:4b
```

## Agora env setup

Required Agora environment variables:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`

Optional Agora behavior variables:

- `NEXT_PUBLIC_AGENT_UID` defaults to `123456`
- `NEXT_AGENT_GREETING`

Copy `.env.example` to `.env.local` and fill in the required values before starting the app.

## Run commands

```bash
pnpm install
pnpm dev
```

Additional validation commands:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

## Troubleshooting

- If `/api/generate-agora-token` returns an env error, verify `NEXT_PUBLIC_AGORA_APP_ID` and `NEXT_AGORA_APP_CERTIFICATE`.
- If `/api/gemma/test` fails, confirm LM Studio or Ollama is running and that `GEMMA_BASE_URL` and `GEMMA_CHAT_URL` match the local server.
- If the browser says microphone access is denied, allow microphone permissions in the browser and try again.
- If the conversation starts but no transcript appears, verify the Agora agent invite succeeded and that the RTM token is valid.
- If `pnpm install` reports ignored build scripts for `sharp` or `unrs-resolver`, run `pnpm approve-builds` in environments that require postinstall scripts.
- If the default `pnpm run build` hits a Turbopack sandbox error in Codex, use `pnpm exec next build --webpack` for local validation.
- If the app fails to build, run `pnpm run typecheck` first to catch type issues, then `pnpm run lint`.

## Known limitations

- The live Agora voice demo still uses the managed agent lifecycle from the reference quickstart.
- Agora must call a public `GEMMA_PUBLIC_CHAT_URL` that points to the Next.js proxy route. That proxy route then calls your local model server.
- The demo expects a local model server, such as LM Studio or Ollama, to be running on your machine for local testing.
- The UI is designed for local demos and does not yet include production auth, user accounts, or persistence.

## How to test Gemma

1. Start LM Studio or Ollama.
2. Run:

```bash
pnpm dev
```

3. In a second terminal, tunnel the Next.js app:

```bash
ngrok http 3000
```

4. Set `GEMMA_BASE_URL` to your local model server.
5. Set `GEMMA_CHAT_URL` to your LM Studio chat endpoint if you are using LM Studio.
6. Set `GEMMA_PUBLIC_CHAT_URL` to the ngrok URL plus `/api/chat/completions`.
7. Open `/api/gemma/test` in the browser or hit it with `curl`.
8. Use `/api/gemma/chat` with a JSON body containing a `messages` array.
9. Optionally test the proxy directly:

```bash
curl -N http://localhost:3000/api/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in one short sentence."}]}'
```

## How to start Agora voice demo

1. Set the Agora env vars in `.env.local`.
2. Keep `GEMMA_BASE_URL` pointed at your local model server.
3. Set `GEMMA_CHAT_URL` to the LM Studio chat endpoint if you use LM Studio.
4. Set `GEMMA_PUBLIC_CHAT_URL` to the public ngrok URL for `app/api/chat/completions`.
5. Start the app:

```bash
pnpm dev
```

6. Open the UI in the browser.
7. Click `Start Conversation`.
8. Allow microphone permissions when prompted.
9. Use `End Conversation` when you are done.

## Final validation

To validate the repo locally, run:

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run build
```

Then confirm:

- `/api/gemma/test` returns a reachable response when Ollama, LM Studio, or the local model server is running
- the app starts locally with `pnpm dev`
- the Agora voice flow still starts and stops cleanly from the UI
