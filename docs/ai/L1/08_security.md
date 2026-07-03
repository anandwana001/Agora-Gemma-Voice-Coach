# 08 Security

> Security model, trust boundaries, secret handling, and safety controls for this demo.

## Trust Boundaries

- Browser is untrusted and never receives `NEXT_AGORA_APP_CERTIFICATE`.
- Next.js server routes hold credentials and mint scoped, expiring tokens.
- Agora cloud executes the managed agent pipeline using server-issued credentials.
- The local Gemma server stays on the developer machine; Agora reaches it only through the public proxy URL configured on the server.

## Secret Handling Rules

- Keep `NEXT_AGORA_APP_CERTIFICATE` server-side only.
- Do not expose `GEMMA_API_KEY` or any model credentials to client bundles.
- Store secrets in `.env.local` for dev and deployment secret store in Vercel.
- `.env.example` documents expected keys without real values.

## Token Security Model

- Tokens expire (default 1 hour).
- Token endpoint allows caller-provided UID/channel but still uses server secret signing.
- Renewal flow requests new RTC/RTM tokens near expiry.
- RTM capability is required and intentionally embedded by `buildTokenWithRtm`.

## Input Validation and Failure Handling

- Route handlers validate required fields and env availability.
- Errors return structured JSON with bounded detail.
- Stop route treats already-stopping/not-found agent as idempotent success.
- Gemma test/chat routes should return friendly errors when the local model server is not reachable.

## Agent Behavior Safety

- Prompt includes explicit honesty and non-hallucination policy for product claims.
- Agent failure message is constrained (`Please wait a moment.`) for degraded-path behavior.
- The prompt also instructs the model to avoid showing chain-of-thought or reasoning traces.

## Operational Security Practices

- Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` before release changes.
- Avoid logging secrets; current logs are operational and should remain non-secret.
- Use least-privilege project bindings when managing Agora environments.
- Treat the public ngrok URL as a temporary bridge, not a permanent secret-bearing endpoint.

## Known Limits

- This demo is a sample app; it does not implement user auth/tenant isolation.
- If productionizing, add authenticated route access and per-user authorization checks.
- The live voice flow is not fully offline because Agora still orchestrates the agent session.

## Security Review Checklist

1. Confirm `NEXT_AGORA_APP_CERTIFICATE` is never referenced in client files.
2. Confirm token minting still uses server route only.
3. Confirm route error payloads do not leak secrets.
4. Confirm Gemma credentials remain server-side.
5. Confirm docs do not instruct users to expose secrets in public config.

## Threat Notes for This Sample

- Token misuse risk is bounded by token expiry but still requires secure key custody.
- Public start/stop endpoints are unauthenticated in sample form; production needs auth.
- RTM message payloads are parsed defensively but should be treated as untrusted input.
- Public Gemma proxy URLs should be considered temporary bridges and rotated if exposed beyond a demo.

## Hardening Steps for Productionization

- Add authenticated identity and authorization to all mutation routes.
- Scope agent start permissions per user/session ownership.
- Add rate limiting for token and invite endpoints.
- Add request tracing IDs for security incident investigation.
- Add environment-specific secret rotation policy and monitoring.
- Add validation around `GEMMA_PUBLIC_CHAT_URL` to ensure it points to a trusted proxy you control.

## Deployment Secret Checklist (Vercel)

- `NEXT_PUBLIC_AGORA_APP_ID` set for all required environments.
- `NEXT_AGORA_APP_CERTIFICATE` set as server-side secret only.
- Optional Gemma proxy settings set only when the model server is reachable from the deployed environment.
- Preview environments use non-production credentials.

## Security-Relevant Files

- `app/api/generate-agora-token/route.ts`
- `app/api/invite-agent/route.ts`
- `app/api/stop-conversation/route.ts`
- `.env.example`
- `README.md` environment section

## Audit Trigger Events

Re-audit security docs when any of these change:

- token issuance logic
- agent start/stop route authorization assumptions
- environment variable set or naming
- Gemma proxy path or local model server assumptions

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Token issuance and renewal sequence details.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — RTM event surfaces and error propagation boundaries.
