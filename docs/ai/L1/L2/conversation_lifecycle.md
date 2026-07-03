> **When to Read This:** Load this when changing how a voice session starts, renews, or stops in the Agora x Gemma demo.

# Conversation Lifecycle

## Overview

This repo orchestrates one live voice session across four coupled systems:

- Next.js browser UI state.
- Agora RTC media transport.
- Agora RTM data transport.
- Agora managed agent backend lifecycle.

The managed agent uses `CustomLLM` and calls the public `/api/chat/completions` proxy route, which then talks to local Gemma through `GEMMA_CHAT_URL` or `GEMMA_BASE_URL`.

## Detailed Start Sequence

1. User clicks start in `QuickstartPreCallCard`.
2. `LandingPage.handleStartConversation` calls `GET /api/generate-agora-token`.
3. In parallel:
- `POST /api/invite-agent` starts the managed agent session.
- RTM client is created, logs in with token, and subscribes to the channel.
4. On success, `agoraData` + `rtmClient` are stored and `ConversationComponent` mounts.
5. `useJoin` connects RTC once `isReady` passes.
6. `AgoraVoiceAI.init()` binds RTC + RTM engines and subscribes to transcript, metrics, and error streams.

## Token Renewal Flow

- Renewal callback receives the joined RTC UID.
- Two renewal calls are made in parallel:
- RTC renewal for the joined UID.
- RTM renewal for the original login UID.
- Both target the same channel.

## Teardown Sequence

1. If `agentId` exists, call `POST /api/stop-conversation`.
2. Stop route calls `client.stopAgent(agent_id)` and treats already-stopping states as success.
3. Frontend logs out RTM client and clears RTM state.
4. `showConversation` reset unmounts the conversation view.
5. `agora-rtc-react` hook ownership handles leave and track cleanup after unmount.
6. Toolkit cleanup path unsubscribes and destroys `AgoraVoiceAI`.

## Failure Modes and Recovery

- Invite failure is non-fatal to the render path: UI still mounts and shows warning.
- RTM bootstrap failure is fatal to start path because transcript pipeline depends on it.
- Stop failures are logged, but UI teardown still continues.
- If the agent cannot reach the local model, confirm `GEMMA_PUBLIC_CHAT_URL` points at the public ngrok URL for `/api/chat/completions`.

## Cross-File Dependencies

- `components/LandingPage.tsx`: bootstrap orchestration and renewal callback.
- `components/ConversationComponent.tsx`: join/toolkit/mic runtime behavior.
- `app/api/generate-agora-token/route.ts`: RTM-capable token minting.
- `app/api/invite-agent/route.ts`: agent pipeline config and `CustomLLM` wiring.
- `app/api/chat/completions/route.ts`: public proxy from Agora to local Gemma.
- `app/api/stop-conversation/route.ts`: idempotent stop semantics.
