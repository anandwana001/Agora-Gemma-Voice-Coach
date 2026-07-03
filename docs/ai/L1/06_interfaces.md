# 06 Interfaces

> Contracts at repo boundaries: API routes, env vars, runtime events, and shared TypeScript payloads.

## HTTP Route Contracts

### `GET /api/generate-agora-token`

Query params:

- `uid` optional; invalid/zero resolves to a random RTM-safe UID.
- `channel` optional; defaults to generated `ai-conversation-<ts>-<rand>`.

Success response:

```json
{ "token": "...", "uid": "1234", "channel": "ai-conversation-..." }
```

Failure response: `{ "error": string, "details"?: string }` with `500`.

### `POST /api/invite-agent`

Body (`ClientStartRequest`):

```json
{ "requester_id": "1234", "channel_name": "ai-conversation-..." }
```

Success (`AgentResponse`):

```json
{ "agent_id": "...", "create_ts": 1710000000, "state": "RUNNING" }
```

Validation failures return `400`; server failures return `500`.

This route uses:

- `CustomLLM` with `GEMMA_PUBLIC_CHAT_URL` or the derived chat-completions URL
- `DeepgramSTT`
- `MiniMaxTTS`

### `POST /api/stop-conversation`

Body (`StopConversationRequest`): `{ "agent_id": "..." }`.

Responses:

- `{ "success": true }`
- `{ "success": true, "state": "already-stopping" }` for idempotent stop state
- `{ "error": string }` on failure

### `POST /api/chat/completions`

OpenAI-compatible public SSE proxy path used by Agora. The proxy calls local Gemma through the server-side `GEMMA_CHAT_URL` or `GEMMA_BASE_URL`.

### `GET /api/gemma/test`

Returns whether the local Gemma endpoint is reachable.

### `POST /api/gemma/chat`

Returns a direct JSON reply from the local Gemma endpoint for manual testing.

## Event/Data Interfaces

- RTM transcript/state/metrics/errors consumed through `AgoraVoiceAI` event emitter.
- Raw RTM `message` event parsed as fallback for `message.error` and `message.sal_status` payloads.
- `AGENT_METRICS` payloads displayed by `QuickstartPipelineMetrics`.

## Environment Contract

Required:

- `NEXT_PUBLIC_AGORA_APP_ID`
- `NEXT_AGORA_APP_CERTIFICATE`

Gemma/local-model variables:

- `GEMMA_BASE_URL`
- `GEMMA_CHAT_URL`
- `GEMMA_MODEL`
- `GEMMA_TIMEOUT_MS`
- `GEMMA_API_KEY`
- `GEMMA_PUBLIC_CHAT_URL`

Optional and behavior-affecting:

- `NEXT_PUBLIC_AGENT_UID`
- `NEXT_AGENT_GREETING`

## Test Coverage for Interfaces

- `pnpm run lint` and `pnpm run typecheck` catch most contract drift.
- `/api/gemma/test`, `/api/gemma/chat`, and `/api/chat/completions` are the key smoke checks for the local model path.

## Shared Client-Side Interfaces

From `types/conversation.ts` (high-use):

- `AgoraTokenData`: token bootstrap payload consumed by `LandingPage`.
- `AgoraRenewalTokens`: renewal callback result (`rtcToken`, `rtmToken`).
- `ConversationComponentProps`: runtime dependencies for in-call component.

## Interface Invariants

- Token payload must always include `token`, `uid`, `channel`.
- Invite route requires both `requester_id` and `channel_name`.
- Stop route requires `agent_id`; missing should never be tolerated silently.
- Token route should always return UID as string for downstream compatibility.
- `/api/chat/completions` must emit SSE chunks in the shape Agora expects.
- `/api/gemma/chat` should return final-answer text, not reasoning traces or object blobs.

## Event Interface Notes

- Metrics stream entries are append-only in component state, capped to recent window.
- Connection issue records carry `source`, `agentUserId`, code/message, timestamp.
- SAL and signaling fallback payloads are parsed defensively because message schema can vary.

## Backward Compatibility Guidance

- If route response shape changes, update both client consumers and docs in the same change.
- If adding fields, keep existing fields stable to avoid demo breakage.
- Reflect interface changes in README and L1 docs to keep the repo runnable from scratch.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — How route contracts are used in sequence.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Event-level contract mapping.
