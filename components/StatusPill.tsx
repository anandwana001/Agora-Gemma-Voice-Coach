'use client';

type StatusTone = 'neutral' | 'good' | 'warn' | 'bad';

type StatusPillProps = {
  label: string;
  value: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-border bg-card text-foreground',
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

export function StatusPill({
  label,
  value,
  tone = 'neutral',
}: StatusPillProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClasses[tone]}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium leading-5">
        {value}
      </div>
    </div>
  );
}
