# 07 Gotchas

> High-impact pitfalls that regularly break session startup, transcript rendering, Gemma proxying, or lifecycle cleanup.

## Critical Runtime Pitfalls

- Using RTC-only token generation breaks RTM login and transcript/state events.
- Removing `isReady` guard can trigger StrictMode double-initialization and duplicate/missing tracks.
- Manual `client.leave()` conflicts with `useJoin` cleanup contract.
- Manual `localMicrophoneTrack.close()` conflicts with hook-owned lifecycle.

## Transcript Pitfalls

- Not remapping toolkit `uid="0"` causes user turns to render as agent turns.
- Dropping `INTERRUPTED` from message history can keep transcript panel from auto-opening on first interrupted turn.
- Skipping punctuation/timestamp normalization creates inconsistent transcript readability and issue time ordering.

## Agent Startup Pitfalls

- Missing `NEXT_PUBLIC_AGORA_APP_ID`/`NEXT_AGORA_APP_CERTIFICATE` yields hard 500s on token/invite/stop routes.
- Mismatch between `NEXT_PUBLIC_AGENT_UID` and invite route `agentUid` causes agent presence confusion.
- RTM subscription failures may only surface through SAL status or raw signaling fallback events.
- If `GEMMA_PUBLIC_CHAT_URL` is not public, the Agora agent cannot reach your local model even if the browser can.

## Frontend Lifecycle Pitfalls

- Initializing toolkit before `joinSuccess` often causes missing subscriptions.
- Tying mic track creation directly to mute state can break visualizer audio graph.
- Failing to teardown RTM client on session end leaks subscriptions and stale events.

## Docs/Process Pitfalls

- Changing `components/` or `app/api/` without syncing `README.md`, `DEMO_SCRIPT.md`, and `docs/ai` leads to stale operator guidance.
- Updating workflows/contracts without updating `docs/ai/L1` and L0 `Last Reviewed` breaks progressive disclosure trust.
- Base recipe contracts also require `docs/ai/RECIPE.md` updates when extension points, invariants, or stable APIs change.

## Fast Triage Checklist

1. Verify token route still uses `buildTokenWithRtm`.
2. Check `uid="0"` remap path.
3. Check `isReady` guard and hook ownership constraints.
4. Inspect connection issues panel for RTM/SAL/agent error signals.
5. Confirm `/api/gemma/test` succeeds before starting a live voice session.

## Frequent Regression Patterns

- Refactoring token route and accidentally removing RTM capability.
- Simplifying transcript list logic and unintentionally dropping interrupted turns.
- Moving toolkit init into mount-only effect and reintroducing StrictMode double-init.
- Replacing `useRef` RTC client storage with recreated client object per render.

## Symptom-to-File Debug Guide

| Symptom | First Files to Inspect |
| --- | --- |
| RTM login fails | `app/api/generate-agora-token/route.ts`, `components/LandingPage.tsx` |
| Agent starts but no transcript | `components/ConversationComponent.tsx`, `lib/conversation.ts` |
| Conversation hangs on end | `components/LandingPage.tsx`, `app/api/stop-conversation/route.ts` |
| Metrics panel empty | `components/ConversationComponent.tsx`, `components/QuickstartPipelineMetrics.tsx` |

## Sandbox and Local Dev Caveats

- `pnpm run dev` can fail in restricted environments due to port/process limits.
- Some failures are environment-binding issues, not code regressions.
- The local model may work in LM Studio while the live Agora session still fails if the public proxy URL is missing.

## Pre-merge Gotcha Checklist

- Confirm no manual `leave()` or `close()` lifecycle calls were introduced.
- Confirm transcript mapping still remaps sentinel local UID.
- Confirm token renewal still returns both RTC and RTM tokens.
- Confirm docs were updated when workflow/interface behavior changed.
- Confirm the Gemma proxy route still strips reasoning and object noise before returning text.

## Incident Learning Notes

- Connection issue deduplication intentionally uses a small time window to avoid noisy cascades.
- Invite failures are intentionally non-fatal to allow UI fallback state visibility.
- Raw RTM fallback parsing exists because higher-level hooks may miss some signaling payloads in edge conditions.
- The live agent is not offline: it still depends on Agora services plus a reachable public model proxy.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Start/stop race and lifecycle ownership details.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Transcript edge cases and failure surfaces.
