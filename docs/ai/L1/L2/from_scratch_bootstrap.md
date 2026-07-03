> **When to Read This:** Load this when you need to recreate the Agora x Gemma voice demo from scratch in a new repo.

# From-Scratch Bootstrap

## Baseline Rule

This repo is a verified Agora quickstart derivative for the Gemma local voice coach demo. Do not implement the flow from memory. Start from the app structure, routes, and docs here, then adapt only after the token, invite, RTC, RTM, Gemma, and transcript flow is understood.

## Implementation Map

| Need | Read First | Deep Detail | Source Reference |
| --- | --- | --- | --- |
| Local setup, commands, env vars | [../01_setup.md](../01_setup.md) | [../05_workflows.md](../05_workflows.md) | `.env.example`, `README.md` |
| End-to-end architecture and data flow | [../02_architecture.md](../02_architecture.md) | [conversation_lifecycle.md](conversation_lifecycle.md) | `components/LandingPage.tsx`, `components/ConversationComponent.tsx` |
| File/module responsibilities | [../03_code_map.md](../03_code_map.md) | none | `app/api`, `components`, `lib`, `types` |
| API payloads and response shapes | [../06_interfaces.md](../06_interfaces.md) | [token_model.md](token_model.md), [invite_agent_config.md](invite_agent_config.md) | `app/api/*/route.ts`, `types/conversation.ts` |
| RTC lifecycle rules | [../04_conventions.md](../04_conventions.md) | [strict_mode_lifecycle.md](strict_mode_lifecycle.md) | `components/ConversationComponent.tsx` |
| Transcript, metrics, and RTM behavior | [../07_gotchas.md](../07_gotchas.md) | [transcript_pipeline.md](transcript_pipeline.md) | `lib/conversation.ts`, transcript/metrics components |
| Security and secret boundaries | [../08_security.md](../08_security.md) | [token_model.md](token_model.md) | token, invite, and stop API routes |
| Validation expectations | [../05_workflows.md](../05_workflows.md) | none | `README.md`, `DEMO_SCRIPT.md` |

## Minimum Implementation Checklist

Implement these pieces in order:

1. Create a Next.js App Router project with React, TypeScript, Tailwind, and the Agora dependencies from `package.json`.
2. Add `.env.example` with Agora credentials, `GEMMA_BASE_URL`, `GEMMA_CHAT_URL`, `GEMMA_MODEL`, `GEMMA_TIMEOUT_MS`, and `GEMMA_PUBLIC_CHAT_URL`.
3. Implement `GET /api/generate-agora-token` with `RtcTokenBuilder.buildTokenWithRtm`; return `{ token, uid, channel }`.
4. Implement `POST /api/invite-agent` with `AgoraClient`, `Agent`, `DeepgramSTT`, `CustomLLM`, `MiniMaxTTS`, RTM enabled, and `{ requester_id, channel_name }` input.
5. Implement `POST /api/stop-conversation` with idempotent already-stopping/not-found handling.
6. Implement `POST /api/chat/completions` as the public SSE proxy used by Agora.
7. Implement `GET /api/gemma/test` and `POST /api/gemma/chat` to check the local model independently.
8. Implement `LandingPage` to fetch token, start the agent, log into RTM, subscribe to the channel, mount the conversation, renew tokens, and log out RTM on end.
9. Implement `ConversationComponent` with StrictMode-safe `isReady`, `useJoin`, `useLocalMicrophoneTrack`, `usePublish`, `AgoraVoiceAI.init`, event subscriptions, token renewal, and hook-owned teardown.
10. Implement transcript helpers that remap `uid="0"` to the local RTC UID, normalize spacing and timestamps, keep `INTERRUPTED`, and render `IN_PROGRESS` separately.

## Required Copy-Forward Invariants

- Token generation uses `RtcTokenBuilder.buildTokenWithRtm`, not an RTC-only builder.
- The browser never receives `NEXT_AGORA_APP_CERTIFICATE`.
- `LandingPage` creates, logs in, subscribes, and logs out the RTM client.
- `ConversationComponent` waits for `isReady && joinSuccess` before `AgoraVoiceAI.init`.
- `useJoin`, `useLocalMicrophoneTrack`, and `usePublish` own leave, track close, and publish cleanup.
- Transcript normalization remaps toolkit `uid="0"` before rendering.
- `INTERRUPTED` turns stay in message history; only `IN_PROGRESS` renders separately.
- `GEMMA_PUBLIC_CHAT_URL` must be public so Agora can reach the local model through the Next.js proxy route.

## Verification

Run narrow checks while building:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

Before publishing a derivative, run the live smoke tests:

- `/api/gemma/test`
- `/api/gemma/chat`
- `/api/chat/completions`

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Code Map](../03_code_map.md)
- [Token Model](token_model.md)
- [Invite Agent Config](invite_agent_config.md)
