'use client';

export type QuickstartAgentMetric = {
  type: string;
  name: string;
  value: number;
  timestamp: number;
};

type QuickstartPipelineMetricsProps = {
  metrics: QuickstartAgentMetric[];
};

const PIPELINE = [
  { key: 'stt', label: 'STT', metricTypes: ['stt', 'asr'] },
  { key: 'llm', label: 'LLM', metricTypes: ['llm', 'mllm'] },
  { key: 'tts', label: 'TTS', metricTypes: ['tts'] },
] as const;

function formatMetricName(name: string) {
  return name.replace(/[_-]+/g, ' ');
}

export function QuickstartPipelineMetrics({
  metrics,
}: QuickstartPipelineMetricsProps) {
  const latestByType = new Map<string, QuickstartAgentMetric>();
  for (const metric of metrics) {
    latestByType.set(metric.type.toLowerCase(), metric);
  }

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap">
      <span className="shrink-0 text-sm font-medium leading-6 text-muted-foreground">
        Pipeline
      </span>
      {PIPELINE.map((step, index) => {
        const metric = step.metricTypes
          .map((type) => latestByType.get(type))
          .find(Boolean);

        return (
          <div key={step.key} className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-semibold leading-4 text-foreground shadow-sm">
              {step.label}
              {metric && (
                <span
                  className="ml-2 text-teal-600 dark:text-teal-300"
                  title={new Date(metric.timestamp).toLocaleTimeString()}
                >
                  {formatMetricName(metric.name)} {Math.round(metric.value)}ms
                </span>
              )}
            </span>
            {index < PIPELINE.length - 1 && (
              <span className="text-xs text-muted-foreground" aria-hidden="true">
                /
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
