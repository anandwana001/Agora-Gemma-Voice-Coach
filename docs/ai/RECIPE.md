---
recipe_version: 0.1.0
recipe_status: stable
extension_points:
  - api.routes
  - prompts.system
  - pipeline.providers
  - gemma.proxy
  - ui.conversation
invariants:
  - baseline.agora-quickstart-derivative
  - tokens.rtc-rtm
  - lifecycle.strict-mode
  - transcript.uid-remap
stable_contracts:
  - env.required
  - api.token
  - api.invite-agent
  - api.stop-conversation
  - api.gemma.test
  - api.gemma.chat
  - api.chat.completions
---

# Agora x Gemma Recipe Profile

This repo is a reusable voice-demo sample for building browser voice-agent experiences with Agora Conversational AI and a local Gemma reasoning layer.

## Recipe Role

- Role: `derived` voice-demo recipe.
- Target audience: developers bootstrapping a production-style Next.js voice agent app that uses local Gemma for reasoning.
- Reuse model: clone, configure Agora + LM Studio, run locally, then customize prompt/pipeline/UI.

## Recipe Scope

This recipe provides a copyable browser voice-agent starter with:

- browser RTC audio and RTM event transport
- server-side token, invite, stop, and custom Gemma routes
- managed STT, custom LLM, and TTS provider configuration
- pre-call, in-call, transcript, metrics, and connection-status UI
- local Gemma test routes for LM Studio or Ollama

## Baseline Implementation Guidance

This repository is a verified Agora quickstart derivative for the Gemma local voice coach demo. Agents should use this repo's source and progressive disclosure docs as the starting point, then customize.

Do not recreate Agora ConvoAI integration from memory. Provider schemas, SDK builder fields, token behavior, and RTM event details can drift. For a new baseline implementation, follow [L1/L2/from_scratch_bootstrap.md](L1/L2/from_scratch_bootstrap.md) while copying verified patterns from this repo.

## Extension Points

- `api.routes`: add browser-facing routes under `app/api`, with shared request/response types in `types/conversation.ts` when the client consumes them.
- `prompts.system`: edit the persona in `lib/gemma-client.ts` and the greeting in `app/api/invite-agent/route.ts`.
- `pipeline.providers`: adjust the `DeepgramSTT`, `CustomLLM`, and `MiniMaxTTS` builder chain.
- `gemma.proxy`: update `app/api/chat/completions/route.ts`, `app/api/gemma/chat/route.ts`, and `lib/gemma-client.ts` if the local model server shape changes.
- `ui.conversation`: customize `QuickstartPreCallCard`, `QuickstartConversationLayout`, `QuickstartTranscriptPanel`, and `QuickstartPipelineMetrics`.

## Invariants

- Keep `RtcTokenBuilder.buildTokenWithRtm` for RTM-capable tokens.
- Treat this repo as the working baseline; customize after preserving a working token, invite, RTC, RTM, Gemma, and transcript flow.
- Preserve StrictMode `isReady` guard for join/mic initialization.
- Preserve UID remap (`uid="0"`) and `INTERRUPTED` message-list inclusion.
- Keep documentation synchronized when workflows/contracts change.
- Keep the public proxy route aligned with the local model server endpoint and the hidden reasoning sanitization path.

## Stable Contracts

- `GET /api/generate-agora-token` returns `{ token, uid, channel }`.
- `POST /api/invite-agent` accepts `{ requester_id, channel_name }` and returns the agent id/state payload.
- `POST /api/stop-conversation` accepts `{ agent_id }` and treats already-stopping sessions as success.
- Required env vars are `NEXT_PUBLIC_AGORA_APP_ID` and `NEXT_AGORA_APP_CERTIFICATE`.
- `GET /api/gemma/test` returns reachability for the local model.
- `POST /api/gemma/chat` returns a direct JSON reply for testing.
- `POST /api/chat/completions` returns SSE text for the Agora managed agent.
- `components/LandingPage.tsx` owns pre-call bootstrap and RTM client lifecycle.
- `components/ConversationComponent.tsx` owns joined-session RTC/toolkit lifecycle.
- `lib/conversation.ts` owns transcript normalization helpers.

## Internal / Subject to Change

- Visual styling and copy in the demo UI.
- The exact local Gemma model identifier and LM Studio port.
- Connection issue display heuristics and metric chip presentation.
- The shape of local model provider payloads.

## Consumer Onboarding Recipe

1. Clone or scaffold from template.
2. Copy `.env.example` to `.env.local`.
3. Start LM Studio and expose the app with ngrok.
4. Run `pnpm dev`.
5. Validate with `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build`.
6. Customize agent behavior and UI using the supported surfaces above.
