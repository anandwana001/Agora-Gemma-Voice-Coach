'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AgoraRTC, {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useJoin,
  usePublish,
  RemoteUser,
} from 'agora-rtc-react';
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  AgentState,
  MessageSalStatus,
  TranscriptHelperMode,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
} from 'agora-agent-client-toolkit';
import { AgentVisualizer } from 'agora-agent-uikit';
import { MicButtonWithVisualizer } from 'agora-agent-uikit/rtc';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import {
  getCurrentInProgressMessage,
  getMessageList,
  mapAgentVisualizerState,
  normalizeTimestampMs,
  normalizeTranscript,
} from '@/lib/conversation';
import { MicrophoneSelector } from './MicrophoneSelector';
import {
  getConversationIssueSeverity,
  type ConnectionIssue,
} from './ConversationErrorCard';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';
import { QuickstartConversationLayout } from './QuickstartConversationLayout';
import {
  QuickstartPipelineMetrics,
  type QuickstartAgentMetric,
} from './QuickstartPipelineMetrics';
import { QuickstartTranscriptPanel } from './QuickstartTranscriptPanel';
import type { ConversationComponentProps } from '@/types/conversation';

const MAX_CONNECTION_ISSUES = 6;

type RtcConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTING'
  | 'RECONNECTING';

type AgoraRtcWithParameters = typeof AgoraRTC & {
  setParameter?: (key: string, value: unknown) => void;
};

type RtmMessageErrorPayload = {
  object: 'message.error';
  module?: string;
  code?: number;
  message?: string;
  send_ts?: number;
};

type RtmSalStatusPayload = {
  object: 'message.sal_status';
  status?: string;
  timestamp?: number;
};

function isRtmMessageErrorPayload(
  value: unknown,
): value is RtmMessageErrorPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.error'
  );
}

function isRtmSalStatusPayload(value: unknown): value is RtmSalStatusPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.sal_status'
  );
}

export default function ConversationComponent({
  agoraData,
  rtmClient,
  onTokenWillExpire,
  onEndConversation,
}: ConversationComponentProps) {
  const client = useRTCClient();
  const remoteUsers = useRemoteUsers();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isConnectionDetailsOpen, setIsConnectionDetailsOpen] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RtcConnectionState>('CONNECTING');
  const agentUID =
    process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);
  const [rawTranscript, setRawTranscript] = useState<
    TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]
  >([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<QuickstartAgentMetric[]>([]);
  const [connectionIssues, setConnectionIssues] = useState<ConnectionIssue[]>([]);
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(null);

  const addConnectionIssue = useCallback((issue: ConnectionIssue) => {
    setConnectionIssues((prev) => {
      const isDuplicate = prev.some(
        (x) =>
          x.agentUserId === issue.agentUserId &&
          x.code === issue.code &&
          x.message === issue.message &&
          Math.abs(x.timestamp - issue.timestamp) < 1500,
      );
      if (isDuplicate) return prev;
      setIsConnectionDetailsOpen(true);
      return [issue, ...prev].slice(0, MAX_CONNECTION_ISSUES);
    });
  }, []);

  const isReady = true;

  const { isConnected: joinSuccess } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: parseInt(agoraData.uid, 10),
    },
    isReady,
  );

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady);

  const microphoneRuntimeNotice = useMemo(() => {
    if (isReady && joinSuccess && !localMicrophoneTrack) {
      return 'Microphone access is not ready yet. Check browser permissions or select a different input device.';
    }
    return null;
  }, [isReady, joinSuccess, localMicrophoneTrack]);

  useEffect(() => {
    if (!client) return;
    try {
      (AgoraRTC as AgoraRtcWithParameters).setParameter?.(
        'ENABLE_AUDIO_PTS',
        true,
      );
    } catch (error) {
      console.warn('Could not set ENABLE_AUDIO_PTS:', error);
    }
  }, [client]);

  useEffect(() => {
    if (!isReady || !joinSuccess) return;

    let cancelled = false;

    (async () => {
      try {
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtmClient },
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: true,
        });

        if (cancelled) {
          try {
            if (AgoraVoiceAI.getInstance() === ai) {
              ai.unsubscribe();
              ai.destroy();
            }
          } catch {}
          return;
        }

        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (t) => {
          setRawTranscript([...t]);
        });
        ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_, event) =>
          setAgentState(event.state),
        );
        ai.on(AgoraVoiceAIEvents.AGENT_METRICS, (_, metrics) => {
          setAgentMetrics((prev) => [...prev, metrics].slice(-8));
        });
        ai.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-message-error-${error.code}`,
            source: 'rtm',
            agentUserId,
            code: error.code,
            message: error.message,
            timestamp: normalizeTimestampMs(error.timestamp),
          });
        });
        ai.on(
          AgoraVoiceAIEvents.MESSAGE_SAL_STATUS,
          (agentUserId, salStatus) => {
            if (
              salStatus.status === MessageSalStatus.VP_REGISTER_FAIL ||
              salStatus.status === MessageSalStatus.VP_REGISTER_DUPLICATE
            ) {
              addConnectionIssue({
                id: `${Date.now()}-${agentUserId}-sal-${salStatus.status}`,
                source: 'rtm',
                agentUserId,
                code: salStatus.status,
                message: `SAL status: ${salStatus.status}`,
                timestamp: normalizeTimestampMs(salStatus.timestamp),
              });
            }
          },
        );
        ai.on(AgoraVoiceAIEvents.AGENT_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-agent-error-${error.code}`,
            source: 'agent',
            agentUserId,
            code: error.code,
            message: `${error.type}: ${error.message}`,
            timestamp: normalizeTimestampMs(error.timestamp),
          });
        });
        ai.subscribeMessage(agoraData.channel);
      } catch (error) {
        if (!cancelled) {
          console.error('[AgoraVoiceAI] init failed:', error);
          setRuntimeNotice(
            error instanceof Error
              ? `Conversation tooling failed to initialize: ${error.message}`
              : 'Conversation tooling failed to initialize. Refresh and try again.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ai = AgoraVoiceAI.getInstance();
        if (ai) {
          ai.unsubscribe();
          ai.destroy();
        }
      } catch {}
    };
  }, [addConnectionIssue, agoraData.channel, client, isReady, joinSuccess, rtmClient]);

  useEffect(() => {
    const handleRtmMessage = (event: {
      message: string | Uint8Array;
      publisher: string;
    }) => {
      const payloadText =
        typeof event.message === 'string'
          ? event.message
          : new TextDecoder().decode(event.message);

      let parsed: unknown;
      try {
        parsed = JSON.parse(payloadText);
      } catch {
        return;
      }

      if (isRtmMessageErrorPayload(parsed)) {
        const p = parsed;
        addConnectionIssue({
          id: `${Date.now()}-${event.publisher}-rtm-msg-error-${p.code ?? 'unknown'}`,
          source: 'rtm-signaling',
          agentUserId: event.publisher,
          code: p.code ?? 'unknown',
          message: `${p.module ?? 'unknown'}: ${p.message ?? 'Unknown signaling error'}`,
          timestamp: normalizeTimestampMs(p.send_ts ?? Date.now()),
        });
        return;
      }

      if (isRtmSalStatusPayload(parsed)) {
        const p = parsed;
        if (
          p.status === 'VP_REGISTER_FAIL' ||
          p.status === 'VP_REGISTER_DUPLICATE'
        ) {
          addConnectionIssue({
            id: `${Date.now()}-${event.publisher}-rtm-sal-${p.status}`,
            source: 'rtm-signaling',
            agentUserId: event.publisher,
            code: p.status,
            message: `SAL status: ${p.status}`,
            timestamp: normalizeTimestampMs(p.timestamp ?? Date.now()),
          });
        }
      }
    };

    rtmClient.addEventListener('message', handleRtmMessage);
    return () => {
      rtmClient.removeEventListener('message', handleRtmMessage);
    };
  }, [rtmClient, addConnectionIssue]);

  const transcript = useMemo(() => {
    return normalizeTranscript(rawTranscript, String(client.uid));
  }, [rawTranscript, client.uid]);

  const messageList = useMemo(() => getMessageList(transcript), [transcript]);

  const currentInProgressMessage = useMemo(() => {
    return getCurrentInProgressMessage(transcript);
  }, [transcript]);

  usePublish([localMicrophoneTrack]);

  const isAgentConnected = useMemo(
    () => remoteUsers.some((user) => user.uid.toString() === agentUID),
    [remoteUsers, agentUID],
  );

  useClientEvent(client, 'connection-state-change', (curState) => {
    setConnectionState(curState);
  });

  const connectionSeverity = useMemo<'normal' | 'warning' | 'error'>(() => {
    if (
      connectionState === 'DISCONNECTED' ||
      connectionState === 'DISCONNECTING'
    ) {
      return 'error';
    }
    if (
      connectionState === 'CONNECTING' ||
      connectionState === 'RECONNECTING'
    ) {
      return 'warning';
    }
    if (connectionIssues.length === 0) {
      return 'normal';
    }
    return connectionIssues.some(
      (issue) => getConversationIssueSeverity(issue) === 'error',
    )
      ? 'error'
      : 'warning';
  }, [connectionState, connectionIssues]);

  const visualizerState = useMemo(
    () =>
      mapAgentVisualizerState(agentState, isAgentConnected, connectionState),
    [agentState, isAgentConnected, connectionState],
  );

  const handleMicToggle = useCallback(async () => {
    const track = localMicrophoneTrack;
    if (!track) {
      setRuntimeNotice(
        'Microphone is not ready yet. Check browser permissions or select a different input device.',
      );
      return;
    }

    const next = !isEnabled;
    try {
      await track.setEnabled(next);
      setIsEnabled(next);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      setRuntimeNotice(
        error instanceof Error
          ? `Microphone action failed: ${error.message}`
          : 'Microphone action failed. Check your input device and try again.',
      );
    }
  }, [isEnabled, localMicrophoneTrack]);

  const handleTokenWillExpire = useCallback(async () => {
    const joinedUID = client.uid;
    if (
      !onTokenWillExpire ||
      joinedUID === null ||
      joinedUID === undefined
    ) {
      return;
    }
    try {
      const { rtcToken, rtmToken } = await onTokenWillExpire(joinedUID.toString());
      await client?.renewToken(rtcToken);
      await rtmClient.renewToken(rtmToken);
    } catch (error) {
      console.error('Failed to renew Agora token:', error);
      setRuntimeNotice(
        error instanceof Error
          ? `Session renewal is having trouble: ${error.message}`
          : 'Session renewal is having trouble. The call may end soon.',
      );
    }
  }, [client, onTokenWillExpire, rtmClient]);

  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire);

  const handleEndConversation = useCallback(async () => {
    setRuntimeNotice(null);
    onEndConversation();
  }, [onEndConversation]);

  return (
    <QuickstartConversationLayout
      statusPanel={
        <ConnectionStatusPanel
          connectionState={connectionState}
          connectionSeverity={connectionSeverity}
          connectionIssues={connectionIssues}
          isOpen={isConnectionDetailsOpen}
          onToggle={() => setIsConnectionDetailsOpen((open) => !open)}
        />
      }
      pipelineMetrics={<QuickstartPipelineMetrics metrics={agentMetrics} />}
      transcriptPanel={
        <QuickstartTranscriptPanel
          messageList={messageList}
          currentInProgressMessage={currentInProgressMessage}
          agentUID={agentUID}
        />
      }
      visualizer={
        <div
          className="relative flex h-full min-h-[20rem] w-full max-w-4xl items-center justify-center"
          role="region"
          aria-label="AI agent status visualization"
        >
          <div className="flex w-full flex-col items-center gap-3">
            <AgentVisualizer state={visualizerState} size="lg" />
            {(runtimeNotice ?? microphoneRuntimeNotice) && (
              <div className="max-w-xl rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-800 dark:text-amber-200">
                {runtimeNotice ?? microphoneRuntimeNotice}
              </div>
            )}
          </div>
          {remoteUsers.map((user) => (
            <div key={user.uid} className="hidden">
              <RemoteUser user={user} />
            </div>
          ))}
        </div>
      }
      controls={
        <div
          className="mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2 backdrop-blur-md"
          role="group"
          aria-label="Audio controls"
        >
          <div className="conversation-mic-host flex items-center justify-center">
            <MicButtonWithVisualizer
              isEnabled={isEnabled}
              setIsEnabled={setIsEnabled}
              track={localMicrophoneTrack}
              onToggle={handleMicToggle}
              className="overflow-visible"
              aria-label={isEnabled ? 'Mute microphone' : 'Unmute microphone'}
              enabledColor="hsl(var(--primary))"
              disabledColor="hsl(var(--destructive))"
            />
          </div>
          <MicrophoneSelector localMicrophoneTrack={localMicrophoneTrack} />
        </div>
      }
      onEndConversation={handleEndConversation}
    />
  );
}
