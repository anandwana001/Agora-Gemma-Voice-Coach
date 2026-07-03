'use client';

import {
  useState,
  useRef,
  Suspense,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
} from '@/types/conversation';
import { getMissingAgoraClientMessage } from '@/lib/runtime-config';
import { ArchitectureStrip } from './ArchitectureStrip';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { StatusPill } from './StatusPill';

const ConversationComponent = dynamic(() => import('./ConversationComponent'), {
  ssr: false,
});

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({ children }: { children: ReactNode }) {
        const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(
          null,
        );
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

export default function LandingPage() {
  const [showConversation, setShowConversation] = useState(false);
  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agoraClientError = getMissingAgoraClientMessage();
  const [gemmaStatus, setGemmaStatus] = useState<
    'not-checked' | 'checking' | 'reachable' | 'unreachable'
  >('not-checked');
  const [gemmaStatusDetail, setGemmaStatusDetail] = useState<string>(
    'Local endpoint not checked yet.',
  );
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<
    'idle' | 'starting' | 'live' | 'ending' | 'error'
  >('idle');
  const [microphoneStatus, setMicrophoneStatus] = useState<
    'idle' | 'checking' | 'ready' | 'denied' | 'unavailable'
  >('idle');
  const [microphoneMessage, setMicrophoneMessage] = useState<string>(
    'No microphone check has been run yet.',
  );
  const activeAgentIdRef = useRef<string | null>(null);
  const activeRtmClientRef = useRef<RTMClient | null>(null);

  useEffect(() => {
    activeAgentIdRef.current = agoraData?.agentId ?? null;
  }, [agoraData?.agentId]);

  useEffect(() => {
    activeRtmClientRef.current = rtmClient;
  }, [rtmClient]);

  useEffect(() => {
    return () => {
      const agentId = activeAgentIdRef.current;
      const activeRtmClient = activeRtmClientRef.current;

      if (activeRtmClient) {
        activeRtmClient.logout().catch(() => {});
      }

      if (agentId) {
        void fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, []);

  const checkMicrophoneAccess = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const message =
        'This browser does not support microphone access. Use a modern browser and try again.';
      setMicrophoneStatus('unavailable');
      setMicrophoneMessage(message);
      throw new Error(message);
    }

    setMicrophoneStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneStatus('ready');
      setMicrophoneMessage('Microphone access granted and ready.');
    } catch (error) {
      const status =
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'denied'
          : 'unavailable';
      const message =
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow access in the browser and try again.'
          : error instanceof Error && error.name === 'NotFoundError'
            ? 'No microphone was found. Connect a microphone or select a different input device.'
          : 'Microphone access could not be initialized. Check your device permissions and audio input.';
      setMicrophoneStatus(status);
      setMicrophoneMessage(message);
      throw new Error(message);
    }
  }, []);

  const handleStartConversation = async () => {
    if (agoraClientError) {
      setError(agoraClientError);
      setSessionPhase('error');
      return;
    }

    setIsLoading(true);
    setSessionPhase('starting');
    setError(null);
    setAgentJoinError(false);
    setMicrophoneMessage('Checking microphone access...');

    let startedAgentId: string | null = null;
    let pendingRtm: RTMClient | null = null;
    let invitedAgent: AgentResponse | null = null;

    try {
      await checkMicrophoneAccess();

      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      const agentResponse = await fetch('/api/invite-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: responseData.uid,
          channel_name: responseData.channel,
        } as ClientStartRequest),
      });

      if (!agentResponse.ok) {
        setAgentJoinError(true);
        const payload = (await agentResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ??
            'The Agora agent could not start. Please check your credentials and try again.',
        );
      }

      const agentData = (await agentResponse.json()) as AgentResponse;
      invitedAgent = agentData;

      const { default: AgoraRTM } = await import('agora-rtm');
      const rtm = new AgoraRTM.RTM(
        process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        responseData.uid,
      ) as RTMClient;
      pendingRtm = rtm;
      await rtm.login({ token: responseData.token });
      await rtm.subscribe(responseData.channel);

      startedAgentId = invitedAgent?.agent_id ?? agentData.agent_id ?? null;
      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData.agent_id });
      setShowConversation(true);
      setSessionPhase('live');
    } catch (err) {
      const agentIdToStop = startedAgentId ?? invitedAgent?.agent_id ?? null;

      if (agentIdToStop || pendingRtm) {
        try {
          if (agentIdToStop) {
            await fetch('/api/stop-conversation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent_id: agentIdToStop }),
            });
          }
        } catch {
          // Ignore cleanup failures; the user already has the main error.
        }
      }
      if (pendingRtm) {
        await pendingRtm.logout().catch(() => {});
      }

      setRtmClient(null);
      setAgoraData(null);
      setShowConversation(false);
      setError(
        microphoneStatus === 'denied' || microphoneStatus === 'unavailable'
          ? microphoneMessage
          : err instanceof Error
            ? err.message
            : 'We could not start the session. Please check Agora credentials, agent status, and microphone access.',
      );
      setSessionPhase('error');
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const sessionData = agoraData;
        if (!sessionData?.channel) {
          throw new Error('Missing channel for token renewal');
        }

        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(
            `/api/generate-agora-token?channel=${sessionData.channel}&uid=${uid}`,
          ),
          fetch(
            `/api/generate-agora-token?channel=${sessionData.channel}&uid=${sessionData.uid}`,
          ),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = async () => {
    setSessionPhase('ending');
    if (agoraData?.agentId) {
      try {
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          console.error('Failed to stop agent:', await response.text());
        }
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    if (rtmClient) {
      try {
        await rtmClient.logout();
      } catch (err) {
        console.error('RTM logout error:', err);
      }
    }
    setRtmClient(null);
    setShowConversation(false);
    setSessionPhase('idle');
    setMicrophoneStatus('idle');
    setMicrophoneMessage('No microphone check has been run yet.');
    activeAgentIdRef.current = null;
    activeRtmClientRef.current = null;
  };

  const handleCheckGemma = async () => {
    setGemmaStatus('checking');
    setGemmaStatusDetail('Checking local Gemma endpoint...');

    try {
      const response = await fetch('/api/gemma/test');
      const payload = (await response.json()) as {
        reachable?: boolean;
        provider?: string;
        baseUrl?: string;
        model?: string;
        error?: string;
      };

      if (!response.ok || !payload.reachable) {
        throw new Error(payload.error ?? 'Local Gemma endpoint is unreachable.');
      }

      setGemmaStatus('reachable');
      setGemmaStatusDetail(
        `${payload.provider ?? 'local'} at ${payload.baseUrl ?? 'unknown'} is reachable using ${payload.model ?? 'the configured model'}.`,
      );
    } catch (error) {
      setGemmaStatus('unreachable');
      setGemmaStatusDetail(
        error instanceof Error
          ? error.message
          : 'Local Gemma endpoint is unreachable.',
      );
    }
  };

  const isConversationLive = showConversation && !!agoraData && !!rtmClient;

  const agoraStatusLabel = (() => {
    if (sessionPhase === 'starting') return 'Starting session';
    if (sessionPhase === 'live') return 'In session';
    if (sessionPhase === 'ending') return 'Ending session';
    if (sessionPhase === 'error') return 'Session error';
    return 'Not started';
  })();

  const agoraTone =
    sessionPhase === 'live'
      ? 'good'
      : sessionPhase === 'starting' || sessionPhase === 'ending'
        ? 'warn'
        : sessionPhase === 'error'
          ? 'bad'
          : 'neutral';

  const gemmaTone =
    gemmaStatus === 'reachable'
      ? 'good'
      : gemmaStatus === 'checking'
        ? 'warn'
        : gemmaStatus === 'unreachable'
          ? 'bad'
          : 'neutral';

  const microphoneStatusLabel =
    microphoneStatus === 'checking'
      ? 'Checking microphone access...'
      : microphoneStatus === 'ready'
        ? 'Microphone access granted and ready.'
        : microphoneStatus === 'denied'
          ? microphoneMessage
          : microphoneStatus === 'unavailable'
            ? microphoneMessage
            : isConversationLive
              ? 'Mic connected to the live RTC session.'
              : microphoneMessage;

  const microphoneTone =
    microphoneStatus === 'ready'
      ? 'good'
      : microphoneStatus === 'checking'
        ? 'warn'
        : microphoneStatus === 'denied' || microphoneStatus === 'unavailable'
          ? 'bad'
          : isConversationLive
            ? 'good'
            : 'neutral';

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="rounded-[28px] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.10)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Image
                  src="/agora-logo-rgb-blue.svg"
                  alt="Agora"
                  width={56}
                  height={16}
                  className="h-3.5 w-auto"
                  priority
                />
                <span>Gemma</span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Agora x Gemma Voice Coach
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Real-time voice AI powered by Agora Conversational AI, with Gemma
                running locally as the reasoning layer.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStartConversation}
                disabled={
                  isLoading ||
                  isConversationLive ||
                  !!agoraClientError ||
                  sessionPhase === 'ending'
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Conversation
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEndConversation}
                disabled={!isConversationLive || sessionPhase === 'ending'}
                className="inline-flex h-11 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-5 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                End Conversation
              </button>

              <button
                type="button"
                onClick={handleCheckGemma}
                disabled={gemmaStatus === 'checking' || sessionPhase === 'ending'}
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gemmaStatus === 'checking' ? 'Checking...' : 'Check Local Gemma'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <StatusPill
              label="Agora session status"
              value={agoraStatusLabel}
              tone={agoraTone}
            />
            <StatusPill
              label="Gemma status"
              value={gemmaStatusDetail}
              tone={gemmaTone}
            />
            <StatusPill
              label="Microphone status"
              value={microphoneStatusLabel}
              tone={microphoneTone}
            />
          </div>

          {agoraClientError && (
            <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {agoraClientError}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {agentJoinError && (
            <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              The Agora agent start call returned a warning, but the browser
              session can still continue.
            </div>
          )}
        </section>

        <ArchitectureStrip />

        <section className="rounded-[32px] border border-border bg-card/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] md:p-6">
          {showConversation ? (
            agoraData && rtmClient ? (
              <Suspense fallback={<LoadingSkeleton />}>
                <ErrorBoundary>
                  <AgoraProvider>
                    <ConversationComponent
                      agoraData={agoraData}
                      rtmClient={rtmClient}
                      onTokenWillExpire={handleTokenWillExpire}
                      onEndConversation={handleEndConversation}
                    />
                  </AgoraProvider>
                </ErrorBoundary>
              </Suspense>
            ) : (
              <div className="flex min-h-[28rem] items-center justify-center rounded-[28px] border border-border bg-background/70 p-8 text-center text-sm text-muted-foreground">
                Failed to load conversation data.
              </div>
            )
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
              <div className="flex min-h-[28rem] flex-col justify-between rounded-[28px] border border-border bg-background/70 p-6 md:p-7">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Ready to launch
                  </div>
                  <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    Start the session when you&apos;re ready.
                  </h2>
                  <p className="mt-4 max-w-prose text-sm leading-7 text-muted-foreground md:text-base">
                    The conversation view will mount once Agora token minting,
                    RTM login, and the managed agent invite are all ready.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      What happens next
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      <li>Mint an Agora RTC + RTM token.</li>
                      <li>Start the managed Agora voice agent session.</li>
                      <li>Join RTC, publish the microphone, and stream transcript events.</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Demo checklist
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      <li>Agora credentials set</li>
                      <li>Gemma endpoint checked locally</li>
                      <li>Mic permissions granted in the browser</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[28rem] flex-col justify-between rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.8))] p-6 md:p-7">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Local Gemma
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Keep the reasoning layer local with Gemma, and verify the
                    model before you start the voice flow.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleCheckGemma}
                    disabled={gemmaStatus === 'checking' || sessionPhase === 'ending'}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {gemmaStatus === 'checking' ? 'Checking...' : 'Check Local Gemma'}
                  </button>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
                    Ollama, LM Studio, or another OpenAI-compatible local server
                    can host the model.
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
                    Use `pnpm dev` to run the app after setting your env vars.
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
