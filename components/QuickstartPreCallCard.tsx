'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div className="mx-auto flex w-[min(92vw,30rem)] flex-col items-start rounded-[24px] border border-border bg-card/90 p-8 shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Agora x Gemma
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight">
        Start a live voice coaching session
      </h1>
      <p className="mt-4 max-w-prose text-sm leading-6 text-muted-foreground">
        This demo uses Agora&apos;s managed Conversational AI lifecycle to start a
        voice session, stream transcripts, and shut the agent down cleanly.
      </p>

      <Button onClick={onStartConversation} disabled={isLoading} className="mt-8">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Start Conversation'
        )}
      </Button>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
