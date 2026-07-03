# 02 Architecture

> Runtime architecture for the browser voice UI, Agora managed agent session, and local Gemma proxy path.

## High-Level Shape

- Next.js App Router frontend and API routes in one app.
- Browser joins Agora RTC and uses RTM for transcript, status, metrics, and errors.
- Server-side routes mint token, start/stop the managed agent, and proxy local Gemma.
- The live agent pipeline is STT -> CustomLLM -> TTS, with Gemma hosted locally and reached through a public proxy URL.

## Component Graph

```text
Browser UI (LandingPage + ConversationComponent)
  -> GET /api/generate-agora-token
  -> POST /api/invite-agent
  -> RTC join/publish mic
  -> RTM subscribe + AgoraVoiceAI events
  -> POST /api/stop-conversation

Next.js API routes
  -> token minting with RTM capability
  -> managed agent lifecycle
  -> /api/gemma/test and /api/gemma/chat for local model checks
  -> /api/chat/completions as the public SSE proxy used by Agora

Agora Cloud
  -> managed agent session
  -> RTM payloads (transcript, state, metrics, error)

Local model server
  -> LM Studio or Ollama on localhost
  -> Next.js proxy route converts the local model into the OpenAI-compatible endpoint Agora expects
```

## Start Sequence

1. UI checks Agora config and local Gemma status.
2. UI fetches RTC+RTM token and channel.
3. UI invites the managed agent and initializes RTM in parallel.
4. UI mounts the conversation view.
5. `useJoin` connects RTC once `isReady` guard passes.
6. `AgoraVoiceAI.init()` subscribes transcript, state, metrics, and error streams.

## End Sequence

1. UI calls `/api/stop-conversation` with `agent_id` if present.
2. UI logs out the RTM client.
3. RTC hook ownership handles leave and unpublish cleanup.
4. Component state resets to the pre-call shell.

## Core State Domains

- Session bootstrap: `LandingPage` (`agoraData`, `rtmClient`, loading/error flags).
- RTC transport and mic: `ConversationComponent` + `agora-rtc-react` hooks.
- Transcript and agent state: `AgoraVoiceAI` events mapped through `lib/conversation.ts`.
- Metrics and connection issues: `AGENT_METRICS`, `MESSAGE_ERROR`, `SAL_STATUS`, and RTM fallback parsing.
- Local Gemma status: `/api/gemma/test`, `/api/gemma/chat`, and `/api/chat/completions`.

## External Dependencies

- `agora-rtc-react` / `agora-rtc-sdk-ng` for media transport.
- `agora-rtm` for data channel.
- `agora-agent-client-toolkit` and `agora-agent-uikit` for conversation logic/UI.
- `agora-agents` for managed agent lifecycle.
- LM Studio or Ollama for local Gemma inference.

## Deployment Modes

- Local development via `pnpm dev`.
- Public tunnel via ngrok for the agent-facing proxy route.
- Optional deployment as a standard Next.js app if you host the model proxy elsewhere.

## Data and Control Boundaries

- Browser never sees the app certificate; only receives signed short-lived tokens.
- Agent lifecycle control (`start`, `stop`) is server-routed.
- Transcript/state/metrics are data-plane RTM events from agent to browser.
- UI control-plane actions (start/end, renew) originate in `LandingPage`.
- The local model server is never called directly by Agora; it is reached through the public Next.js proxy route.

## Internal Interfaces Between Components

`LandingPage` -> `ConversationComponent` props:

- `agoraData` (`token`, `uid`, `channel`, optional `agentId`)
- `rtmClient` (already logged in and subscribed)
- `onTokenWillExpire(uid)` callback for token renewal
- `onEndConversation()` callback for teardown and route stop call

`ConversationComponent` -> child UI components:

- normalized transcript items and current in-progress turn
- agent visualizer state derived from transport + semantic state
- connection issue list and derived severity
- recent metric window for stage latency chips

## Why the App Router Structure Matters

- API handlers under `app/api` co-deploy with UI and share env management.
- Client components isolate browser-only SDK usage via dynamic import and `ssr: false`.
- This avoids SSR-side access to WebRTC-dependent modules.
- The Gemma proxy route stays server-side so the local model server address does not leak into the browser.

## Change Impact Hints

- Changes to token or invite routes affect both startup and renewal paths.
- Changes to transcript mapping can break both transcript panel and visualizer semantics.
- Changes to RTM setup in `LandingPage` affect toolkit subscription readiness.
- Changes to the Gemma proxy or LM Studio chat adapter affect both the local test routes and the managed agent voice flow.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Detailed bootstrapping and teardown timeline.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Event mapping, UID remap, in-progress/completed segmentation.
