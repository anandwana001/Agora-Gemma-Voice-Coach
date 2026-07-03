'use client';

const STEPS = [
  'Mic',
  'Agora Conversational AI',
  'Local Gemma',
  'Voice response',
  'Transcript UI',
];

export function ArchitectureStrip() {
  return (
    <section className="rounded-3xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Architecture
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div className="rounded-full border border-border bg-background px-3 py-2 text-sm font-medium">
              {step}
            </div>
            {index < STEPS.length - 1 && (
              <span className="text-lg text-muted-foreground" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
