> **When to Read This:** Load this when you are changing how tokens are built, renewed, or distributed between RTC and RTM clients.

# Token Model

## The One Token Rule

This demo issues one token string per request that carries both RTC and RTM privileges. The builder used is `RtcTokenBuilder.buildTokenWithRtm` from `agora-token`. An RTC-only token does not authorize RTM login.

## Token Build

`app/api/generate-agora-token/route.ts` (shape):

```ts
const EXPIRATION_TIME_IN_SECONDS = 3600;
const uid = parsedUidFromQuery > 0 ? parsedUidFromQuery : generateUid();
const channel = parsedChannelFromQuery ?? randomChannelName();

const token = RtcTokenBuilder.buildTokenWithRtm(
  appId,
  appCertificate,
  channel,
  String(uid),
  role,
  EXPIRATION_TIME_IN_SECONDS,
  EXPIRATION_TIME_IN_SECONDS,
);
```

Notes:

- `uid` is stringified in the response but the browser parses it numerically before calling `useJoin`.
- `uid=0`, negative UIDs, and missing UIDs all generate a non-zero UID.
- `channel` is generated server-side when the caller omits it.
- `EXPIRATION_TIME_IN_SECONDS` is 1 hour.

## Initial Distribution

```
Browser (LandingPage)
  └─▶ GET /api/generate-agora-token
        └─▶ { token, uid, channel }
              ├─▶ useJoin(uid, token, channel)   ← RTC
              └─▶ rtmClient.login({ token })    ← RTM (same token string)
```

## Token Renewal Sequence

RTC fires `token-privilege-will-expire` roughly 30s before expiry. The handler fetches two renewed tokens:

- RTC renewal for the current joined UID.
- RTM renewal for the original login UID.

Why two fetches?

- The browser may have joined RTC with a server-assigned UID different from the one used at RTM login.
- Renewing RTC and RTM separately keeps each client identity stable across renewal.

## Failure Modes

| Symptom | Cause |
| --- | --- |
| RTM login throws `INVALID_TOKEN` | Token built with RTC-only builder. |
| RTC disconnects about an hour into a call with no renewal | Renewal path not wired or returned early. |
| RTM keeps working but RTC drops | Only RTC renewal failed. |
| `500 Agora credentials are not set` | `NEXT_AGORA_APP_CERTIFICATE` missing or empty. |

## Security Considerations

- The certificate never leaves the server.
- The route does not authenticate the caller.
- Token expiry is the only revocation mechanism in this sample.

## See Also

- [Back to Setup](../01_setup.md)
- [Back to Interfaces](../06_interfaces.md)
- [Back to Security](../08_security.md)
