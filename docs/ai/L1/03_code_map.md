# 03 Code Map

> Directory-level ownership map for the Agora + Gemma demo and where to change behavior safely.

## Top-Level Layout

```text
app/                 Next.js routes + API handlers
components/          Client UI and RTC/RTM lifecycle
lib/                 Shared constants, Gemma client, and transcript helpers
docs/                Human-oriented guides
docs/ai/             Progressive disclosure docs (this system)
public/              Static assets and branding
types/               Shared TypeScript route/component contracts
```

## API Route Ownership (`app/api`)

- `generate-agora-token/route.ts`: builds RTC+RTM token via `buildTokenWithRtm`.
- `invite-agent/route.ts`: validates input/env, configures and starts the managed agent session with `CustomLLM`.
- `stop-conversation/route.ts`: stops the agent and handles idempotent already-stopping cases.
- `chat/completions/route.ts`: public OpenAI-compatible SSE proxy used by Agora.
- `gemma/test/route.ts`: checks local Gemma reachability.
- `gemma/chat/route.ts`: local Gemma chat test route for direct browser checks.

## Client Ownership (`components`)

- `LandingPage.tsx`: pre-call shell, token/invite/RTM bootstrap, conversation mount/unmount.
- `ConversationComponent.tsx`: RTC join, mic publish, toolkit init, transcript/metrics/issues state.
- `QuickstartConversationLayout.tsx`: in-call framing and slots.
- `QuickstartTranscriptPanel.tsx`: live transcript panel.
- `QuickstartPipelineMetrics.tsx`: latency chips from metrics stream.
- `ConnectionStatusPanel.tsx` + `ConversationErrorCard.tsx`: issue rendering and severity.
- `ArchitectureStrip.tsx`: the UI summary of Mic -> Agora -> Gemma -> Voice -> Transcript.

## Shared Logic (`lib`)

- `agora.ts`: default constants (`DEFAULT_AGENT_UID`).
- `conversation.ts`: transcript normalization, spacing cleanup, timestamp normalization, visualizer state mapping.
- `gemma-client.ts`: provider detection, request shaping, local model checks, and reasoning-text sanitization.
- `runtime-config.ts`: shared env/error helpers for Agora and Gemma setup.

## Validation and Tooling

- `lint` script: eslint over the repo.
- `typecheck` script: TypeScript no-emit check.
- `build` script: production Next.js build.

## Fast File Lookup

- Change agent prompt/model/VAD -> `app/api/invite-agent/route.ts`.
- Change token policy/channel naming -> `app/api/generate-agora-token/route.ts`.
- Change transcript mapping behavior -> `lib/conversation.ts` + `components/ConversationComponent.tsx`.
- Change session bootstrap UX -> `components/LandingPage.tsx`.
- Change Gemma provider selection or sanitization -> `lib/gemma-client.ts`.
- Change local model test route behavior -> `app/api/gemma/test/route.ts` and `app/api/gemma/chat/route.ts`.

## Additional Component Roles

- `QuickstartPreCallCard.tsx`: start CTA and pre-call messaging.
- `QuickstartConversationLayout.tsx`: shared in-call composition shell.
- `MicrophoneSelector.tsx`: input-device selection UI.
- `ConnectionStatusPanel.tsx`: summary + detailed connection issue panel.
- `ErrorBoundary.tsx`: runtime guardrail for conversation subtree.

## Type Contract Locations

- `types/conversation.ts`: request/response payloads and component prop types.
- `types/env.d.ts`: typed environment variable expectations.

## Static and Styling Assets

- `public/*`: icons, logos, and heading SVG assets used in pre-call/in-call experience.
- `app/globals.css`: baseline theme/layout styles.
- `tailwind.config.ts`: utility class scan and theme extension.

## Verification Path Mapping

- Local format and type checks: `pnpm run lint` and `pnpm run typecheck`.
- Production bundle check: `pnpm run build`.
- Manual Gemma and Agora smoke checks: `/api/gemma/test`, `/api/gemma/chat`, and the browser UI.

## Ownership Boundaries

- `components/` owns client runtime lifecycle and UI state.
- `app/api/` owns privileged operations needing app certificate.
- `lib/` owns pure transforms and local model adapters.
- `docs/` owns human-facing implementation narrative and runbooks.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Cross-file call path during start/stop.
- [from_scratch_bootstrap.md](L2/from_scratch_bootstrap.md) — Baseline map for recreating this Agora + Gemma demo from scratch.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Mapping and rendering flow from toolkit events.
