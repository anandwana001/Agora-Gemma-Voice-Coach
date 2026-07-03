# Agora x Gemma Voice Coach — Repo Card

> Next.js voice demo that uses Agora Conversational AI for the live session and local Gemma as the reasoning layer.

## Identity

| Field | Value |
| --- | --- |
| Repo | `gemma-local-voice-coach` |
| Type | `frontend-app` |
| Language | TypeScript, Next.js App Router, React 19 |
| Deploy Target | Local Node.js dev server |
| Owner | Agora Conversational AI + Gemma integration demo |
| Recipe Role | derived |
| Recipe Version | 0.1.0 |
| Recipe Status | stable |
| Last Reviewed | 2026-07-03 |

## L1 — Summaries

The Audience column helps agents prioritise: **Use** = consuming the repo behavior, **Maintain** = changing internals.

| File | Purpose | Audience |
| --- | --- | --- |
| [01_setup](L1/01_setup.md) | Local setup, LM Studio, ngrok, and validation commands | Use & Maintain |
| [02_architecture](L1/02_architecture.md) | Browser voice flow, Agora session lifecycle, Gemma proxy path | Maintain |
| [03_code_map](L1/03_code_map.md) | Directory/module map and ownership boundaries | Maintain |
| [04_conventions](L1/04_conventions.md) | Lifecycle patterns, prompt rules, and docs sync rules | Maintain |
| [05_workflows](L1/05_workflows.md) | Run, modify, validate, and demo workflows | Use & Maintain |
| [06_interfaces](L1/06_interfaces.md) | API contracts, event payloads, env contracts | Use & Maintain |
| [07_gotchas](L1/07_gotchas.md) | High-impact pitfalls and known failure modes | Maintain |
| [08_security](L1/08_security.md) | Secret handling, public proxy boundaries, auth/token model | Maintain |
