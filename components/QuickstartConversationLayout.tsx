'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-left">
      <header className="shrink-0 border-b border-border/80 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold leading-none tracking-[-0.025em] text-foreground">
                Agora x Gemma Voice Coach
              </span>
              {pipelineMetrics}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Real-time voice coaching with Agora on the media path and local
              Gemma available as the reasoning layer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {statusPanel}
            <Button
              variant="destructive"
              size="sm"
              className="h-9 rounded-full border border-destructive bg-transparent px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
              onClick={onEndConversation}
              aria-label="End conversation with AI agent"
              title="End conversation"
            >
              End Conversation
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 px-4 pb-4 pt-4 md:px-6 lg:gap-6 lg:pb-6">
        <section className="overflow-hidden rounded-[32px] border border-border/80 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.10),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.84))] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex min-h-[30rem] flex-col justify-between p-5 md:p-6 lg:p-7">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {visualizer}
            </div>
            <div className="shrink-0 pt-5">{controls}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-border/80 bg-card/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          {transcriptPanel}
        </section>
      </div>
    </div>
  );
}
