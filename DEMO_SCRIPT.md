# Agora x Gemma Voice Coach Demo Script

## Before the demo

1. Download and start the LM Studio model.
2. Run the app dependencies install.

```bash
pnpm install
```

3. Create `.env.local` from `.env.example` and set:

```bash
GEMMA_BASE_URL=http://localhost:12345
GEMMA_CHAT_URL=http://localhost:12345/api/v1/chat
GEMMA_MODEL=google/gemma-4-e2b
GEMMA_TIMEOUT_MS=30000
```

If you download a different model in LM Studio, keep the same setup but change `GEMMA_MODEL` to match the exact model identifier LM Studio shows.

4. Start the Next.js app.

```bash
pnpm dev
```

5. In a second terminal, tunnel the Next.js app.

```bash
ngrok http 3000
```

6. Set `GEMMA_PUBLIC_CHAT_URL` to the ngrok URL plus `/api/chat/completions`.

## Live walkthrough

1. Open the UI.
2. Point out the title and the branding.
3. Click `Check Local Gemma` and show the Gemma status update.
4. Explain the architecture strip:
   - Mic
   - Agora Conversational AI
   - Local Gemma
   - Voice response
   - Transcript UI
5. Click `Start Conversation`.
6. Allow microphone permissions.
7. Speak a short prompt like `Explain how this demo works`.
8. Show the transcript panel and the status chips updating.
9. Mention that `/api/chat/completions` is the proxy route Agora calls.
10. Click `End Conversation` and confirm teardown.

## Suggested talking points

- Agora handles the live voice session lifecycle.
- Gemma runs locally and can be tested independently.
- The proxy route keeps the local model private while still letting Agora reach it through ngrok.
- The UI is tuned for live demos and easy troubleshooting.
