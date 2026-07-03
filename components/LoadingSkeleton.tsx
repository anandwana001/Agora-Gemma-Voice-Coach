'use client';

const SKELETON_BAR_HEIGHTS = Array.from(
  { length: 40 },
  (_, index) => `${20 + ((index * 17) % 60)}%`,
);

export function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 p-4 animate-pulse">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="h-9 w-32 rounded-md bg-muted/50" />
      </div>

      <div className="flex h-56 w-full items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <div className="flex h-32 items-end justify-center gap-1">
            {SKELETON_BAR_HEIGHTS.map((height, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-muted/50"
                style={{ height }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="h-4 text-center">
        <div className="mx-auto h-3 w-24 rounded bg-muted/50" />
      </div>

      <div className="fixed bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2">
        <div className="h-2 w-2 rounded-full bg-muted/50" />
        <div className="h-12 w-12 rounded-full bg-muted/50" />
        <div className="h-10 w-10 rounded-full bg-muted/50" />
      </div>

      <div className="fixed bottom-32 right-4 w-80 rounded-lg border border-border bg-card/80 p-4 backdrop-blur-md">
        <div className="space-y-3">
          <div className="h-4 w-3/4 rounded bg-muted/50" />
          <div className="h-4 w-1/2 rounded bg-muted/50" />
          <div className="h-4 w-5/6 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
