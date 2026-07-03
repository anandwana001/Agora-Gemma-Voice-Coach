> **When to Read This:** Load this when you are touching `useJoin`, `useLocalMicrophoneTrack`, `usePublish`, the `AgoraRTCProvider` wiring, or `AgoraVoiceAI.init` timing.

# StrictMode Lifecycle

## Why It Matters

React 19 StrictMode runs the dev lifecycle as mount -> unmount -> mount. RTC and `AgoraVoiceAI` hold real network and device resources. A naive integration can join twice, acquire two microphone tracks, or initialize the toolkit twice.

## The `isReady` Pattern

`components/ConversationComponent.tsx`:

```tsx
const [isReady, setIsReady] = useState(false);
useEffect(() => {
  let cancelled = false;
  const id = setTimeout(() => {
    if (!cancelled) setIsReady(true);
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(id);
    setIsReady(false);
  };
}, []);
```

The cleanup fires synchronously before any `setTimeout(..., 0)` task runs. In StrictMode's fake-unmount, that cancels the first scheduled `setIsReady(true)`. Only the real second mount actually flips `isReady` to true.

## RTC Client in `useRef`

- `useRef` keeps the same client instance across StrictMode mounts.
- `useMemo` would recreate the client on the second mount and break hook cleanup.
- The `AgoraRTCProvider` is dynamically imported because the RTC SDK is browser-only.

## AgoraVoiceAI Initialization Order

`AgoraVoiceAI.init` is async and must be awaited. Use a cancellation flag so cleanup can safely ignore late initialization.

Critical points:

- The effect depends on `isReady` and `joinSuccess`.
- Cleanup tears down `AgoraVoiceAI` before the next real mount.
- There is no `disconnect()` method; cleanup is `unsubscribe()` then `destroy()`.

## Hook Ownership Rules

| Hook | Owns | Anti-pattern |
| --- | --- | --- |
| `useJoin` | `client.leave()` | Calling `client.leave()` manually in cleanup |
| `useLocalMicrophoneTrack` | Track creation + `.close()` | Calling `track.close()` after StrictMode unmount |
| `usePublish` | publish state | Manually unpublish to mute |

If you need to mute, call `localMicrophoneTrack.setEnabled(false)`.

## Failure Modes If You Break the Pattern

| Symptom | Likely cause |
| --- | --- |
| Two simultaneous RTC sessions, one rejected | `useJoin` activated before `isReady` settled |
| Microphone busy / device errors in dev | Track created twice; second one orphaned |
| Transcript events duplicated | `AgoraVoiceAI.init` ran twice |
| `client.leave is undefined` during cleanup | Client recreated mid-flight |
| Agent state never advances past `IDLE` | RTM subscribe ran before RTM login |

## See Also

- [Back to Conventions](../04_conventions.md)
- [Back to Gotchas](../07_gotchas.md)
- [Transcript Pipeline](transcript_pipeline.md)
