> **When to Read This:** Load this document when you are changing the managed agent prompt, voice behavior, VAD settings, model selection, or Gemma proxy wiring.

# Invite Agent Config

## Where It Lives

All managed agent configuration is built in `app/api/invite-agent/route.ts`. The route receives `{ requester_id, channel_name }` from `LandingPage`, constructs an `Agent` from `agora-agents`, and starts a session bound to the requester's RTC channel.

## Top-Level Constants

| Constant | Default | Purpose |
| --- | --- | --- |
| `SYSTEM_PROMPT` | Persona from `lib/gemma-client.ts` | The system prompt for the model. |
| `GREETING` | Friendly first line | Spoken on session start unless `NEXT_AGENT_GREETING` is set. |

`NEXT_AGENT_GREETING` overrides `GREETING` at runtime. The persona text is shared across the test route, proxy route, and invite route so the final text stays consistent.

## The Agent Builder Chain

```ts
const agent = new Agent({
  client,
  instructions: SYSTEM_PROMPT,
  greeting: GREETING,
  failureMessage: 'Please wait a moment.',
  maxHistory: 50,
  turnDetection: { ... },
  advancedFeatures: { enable_rtm: true, enable_tools: true },
  parameters: {
    audio_scenario: 'chorus',
    data_channel: 'rtm',
    enable_error_message: true,
    enable_metrics: true,
  },
})
  .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
  .withLlm(new CustomLLM({
    apiKey: gemmaApiKey,
    url: gemmaChatUrl,
    model: gemmaConfig.model,
    systemMessages: [{ role: 'system', content: SYSTEM_PROMPT }],
  }))
  .withTts(new MiniMaxTTS({
    model: 'speech_2_6_turbo',
    voiceId: 'English_captivating_female1',
  }));
```

## Session Options

`createSession` is called with the channel, agent UID, requester UID, and expiry options. `session.start()` returns the `agentId`.

| Option | Effect |
| --- | --- |
| `channel` | RTC channel the agent joins. |
| `agentUid` | UID the agent occupies in the channel. |
| `remoteUids` | Restricts the agent to the requester's UID. |
| `idleTimeout` | Seconds of silence before the session ends. |
| `expiresIn` | Hard ceiling on session length. |
| `debug` | Logs Agora REST API calls when `true`. |

## Editing Each Surface

### Change the prompt

Edit the persona in `lib/gemma-client.ts`.

### Change the greeting

Edit `GREETING` or set `NEXT_AGENT_GREETING` in `.env.local` or the deployment environment.

### Change VAD behavior

Edit `turnDetection.config.start_of_speech` and `turnDetection.config.end_of_speech`.

### Swap the STT model

Replace the `DeepgramSTT` constructor.

### Swap the LLM

Change the Gemma target by updating `GEMMA_PUBLIC_CHAT_URL`, `GEMMA_CHAT_URL`, `GEMMA_BASE_URL`, or `GEMMA_MODEL`.

### Swap the TTS

Replace `MiniMaxTTS`.

## Response Contract

On success the route returns `AgentResponse`:

```json
{
  "agent_id": "string",
  "create_ts": 1700000000,
  "state": "RUNNING"
}
```

`agent_id` is what `LandingPage` later passes to `/api/stop-conversation`.

## Failure Modes

| Symptom | Cause |
| --- | --- |
| `400 channel_name and requester_id are required` | Browser sent an empty body or wrong field names. |
| `500 Agora credentials are not set` | `NEXT_AGORA_APP_CERTIFICATE` missing in env. |
| Agent joins but never speaks | LLM proxy URL missing or local model unreachable. |
| Agent state stuck on `IDLE` | RTM not enabled or client not subscribed yet. |
| Model output includes reasoning traces | The local model prompt or response sanitizer needs attention. |

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Interfaces](../06_interfaces.md)
- [Token Model](token_model.md)
