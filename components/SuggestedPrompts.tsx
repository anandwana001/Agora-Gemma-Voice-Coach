'use client';

type SuggestedPromptsProps = {
  prompts: string[];
  onSelect: (prompt: string) => void;
};

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Suggested prompts
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-border bg-background px-3 py-2 text-left text-sm leading-5 text-foreground transition hover:border-primary/40 hover:bg-primary/5"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}
