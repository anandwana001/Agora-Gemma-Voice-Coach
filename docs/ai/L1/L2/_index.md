# Deep Dives Index

| Document | Summary | Load When |
| --- | --- | --- |
| [conversation_lifecycle.md](conversation_lifecycle.md) | End-to-end start, join, streaming, renewal, and teardown sequence | Changing session bootstrap, token flow, agent invite, or teardown logic |
| [from_scratch_bootstrap.md](from_scratch_bootstrap.md) | Implementation map for recreating this Agora + Gemma demo from scratch | Implementing a new repo based on this demo pattern |
| [invite_agent_config.md](invite_agent_config.md) | Managed agent prompt, VAD, CustomLLM, and session options | Editing agent behavior, Gemma proxy wiring, or voice config |
| [strict_mode_lifecycle.md](strict_mode_lifecycle.md) | React StrictMode-safe RTC/toolkit initialization patterns | Modifying `useJoin`, mic track lifecycle, or `AgoraVoiceAI.init` timing |
| [token_model.md](token_model.md) | RTC+RTM token build/renewal model and failure modes | Changing token minting, renewal, UID/channel semantics, or expiry |
| [transcript_pipeline.md](transcript_pipeline.md) | Transcript/event normalization from AgoraVoiceAI and RTM fallback parsing | Changing transcript rendering, metrics/error handling, or RTM integration |
