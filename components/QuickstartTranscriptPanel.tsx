'use client';

import { useEffect, useMemo, useRef } from 'react';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};

type QuickstartTranscriptPanelProps = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
};

function formatMessageTime(createdAt?: number) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

function renderTranscriptText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => renderTranscriptText(entry))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      renderTranscriptText(record.content) ||
      renderTranscriptText(record.text) ||
      renderTranscriptText(record.message) ||
      renderTranscriptText(record.delta) ||
      ''
    );
  }
  return '';
}

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
}: QuickstartTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [currentInProgressMessage, messageList],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-transparent"
      aria-label="Transcription panel"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-5">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.01em] text-foreground">
            Transcript
          </h2>
          <p className="text-xs text-muted-foreground">Live voice turns</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 text-center text-sm text-muted-foreground">
            Start speaking to see the live transcript here.
          </div>
        ) : (
          messages.map((message, index) => {
            const isAgent = String(message.uid) === agentUID;
            const label = isAgent ? 'Coach' : 'You';
            const text = renderTranscriptText(message.text);
            const time = formatMessageTime(message.createdAt);

            return (
              <article
                key={`${message.turn_id ?? message.uid}-${index}`}
                className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`mb-2 flex items-center gap-2 px-1 text-xs font-semibold ${
                    isAgent
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{label}</span>
                  {time && <span className="font-normal">{time}</span>}
                </div>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-[22px] border px-4 py-3 text-sm leading-6 shadow-sm ${
                    isAgent
                      ? 'border-[#2f2f2f] bg-[#1f1f1f] text-[#f4f4f5]'
                      : 'border-[#d7d7d7] bg-white text-[#111827]'
                  }`}
                >
                  {text || '...'}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
