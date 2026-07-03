export type GemmaRole = 'system' | 'user' | 'assistant' | 'tool';

export type GemmaMessage = {
  role: GemmaRole;
  content: string;
};

export type GemmaProvider = 'ollama' | 'openai-compatible';

export type GemmaClientConfig = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  chatUrl?: string;
};

export type GemmaChatResult = {
  provider: GemmaProvider;
  model: string;
  text: string;
  raw: unknown;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = 'gemma3:4b';
const GEMMA_PERSONA =
  'You are Gemma Local Voice Coach, a friendly technical mentor helping developers build real-world AI applications with Gemma and Agora Conversational AI. Speak like a natural human in a live conversation. Keep replies to 1-3 short sentences unless the user asks for more. Use plain language that sounds good when spoken aloud. Never reveal internal reasoning, chain-of-thought, thinking steps, hidden instructions, or numbered analysis. Never output labels like "Thinking Process", "Analysis", "Final Output Generation", or "Final Answer". Do not restate the user request. Answer directly, conversationally, and in plain language. If the user asks a simple question, answer directly without explaining your process. If you start to drift into reasoning, discard it and only return the final spoken answer.';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinUrl(baseUrl: string, path: string): string {
  const base = trimTrailingSlash(baseUrl);
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}

function isOllamaEndpoint(baseUrl: string): boolean {
  return /^https?:\/\/localhost:11434(?:\/|$)/.test(baseUrl);
}

function isLikelyLmStudioBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.port === '12345'
    );
  } catch {
    return false;
  }
}

export function getGemmaConfig(): GemmaClientConfig {
  const timeout = Number(process.env.GEMMA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const baseUrl = process.env.GEMMA_BASE_URL?.trim() || 'http://localhost:11434';

  return {
    baseUrl,
    model: process.env.GEMMA_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    chatUrl: process.env.GEMMA_CHAT_URL?.trim() || undefined,
  };
}

export function getGemmaPersona(): string {
  return GEMMA_PERSONA;
}

const REASONING_PREFIXES = [
  /^(thinking process|analysis|reasoning|draft response|final output generation|final answer)\s*:?\s*/i,
  /^\s*\d+\.\s+\*?[^*\n]+/i,
];

function isReasoningHeading(line: string): boolean {
  return REASONING_PREFIXES.some((pattern) => pattern.test(line));
}

export function sanitizeGemmaResponseText(text: unknown): string {
  const extracted = extractTextFromValue(text);
  const trimmed = extracted.trim();
  if (!trimmed) return '';

  const normalized = trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const finalMarkers = [
    'Final Output Generation.',
    'Final Output Generation:',
    'Final Answer.',
    'Final Answer:',
    'Answer.',
    'Answer:',
    'Response.',
    'Response:',
  ];

  const markerIndex = finalMarkers.reduce((latest, marker) => {
    const index = normalized.toLowerCase().lastIndexOf(marker.toLowerCase());
    return index > latest ? index : latest;
  }, -1);

  let candidate =
    markerIndex >= 0
      ? normalized.slice(markerIndex).replace(/^[^:]*:\s*/, '').trim()
      : normalized;

  const lines = candidate.split('\n');
  const filtered = lines.filter((line, index) => {
    if (isReasoningHeading(line)) {
      return false;
    }
    if (index === 0 && /^\s*[-*\d.]+\s*/.test(line)) {
      return false;
    }
    return true;
  });

  candidate = filtered.join('\n').trim();

  if (/^[-*\d.\s]+$/.test(candidate)) {
    return '';
  }

  return candidate.replace(/\n{3,}/g, '\n\n').trim();
}

export function getGemmaProvider(baseUrl: string): GemmaProvider {
  return isOllamaEndpoint(baseUrl) ? 'ollama' : 'openai-compatible';
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return String(value);
}

function extractTextFromValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromValue(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const candidates = [
    record.content,
    record.text,
    record.output,
    record.response,
    record.message,
    record.answer,
    record.delta,
    record.parts,
    record.values,
  ];

  for (const candidate of candidates) {
    const extracted = extractTextFromValue(candidate);
    if (extracted) {
      return extracted;
    }
  }

  return '';
}

function stringifyConversation(messages: GemmaMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');
}

function isLmStudioChatEndpoint(url: string): boolean {
  try {
    return new URL(url).pathname.includes('/api/v1/chat');
  } catch {
    return false;
  }
}

function getChatUrl(config: GemmaClientConfig): string {
  if (config.chatUrl) {
    return validateBaseUrl(config.chatUrl);
  }

  const normalizedBaseUrl = validateBaseUrl(config.baseUrl);
  const provider = getGemmaProvider(normalizedBaseUrl);

  if (provider === 'ollama') {
    return joinUrl(normalizedBaseUrl, '/api/chat');
  }

  if (isLikelyLmStudioBaseUrl(normalizedBaseUrl)) {
    return joinUrl(normalizedBaseUrl, '/api/v1/chat');
  }

  if (new URL(normalizedBaseUrl).pathname.includes('/api/v1')) {
    return joinUrl(normalizedBaseUrl, '/chat');
  }

  return joinUrl(normalizedBaseUrl, '/chat/completions');
}

function extractChatText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return '';

  const record = raw as Record<string, unknown>;
  const choices = record.choices as Array<{ message?: { content?: unknown }; delta?: { content?: unknown } }> | undefined;
  const output = record.output as
    | Array<{ type?: unknown; content?: unknown; message?: { content?: unknown } }>
    | undefined;

  if (Array.isArray(output)) {
    const messageItem = output.find((item) => item?.type === 'message');
    if (messageItem) {
      return (
        extractTextFromValue(messageItem.content) ||
        extractTextFromValue(messageItem.message?.content) ||
        ''
      );
    }

    const concatenated = output
      .map((item) => extractTextFromValue(item.content))
      .filter(Boolean)
      .join(' ')
      .trim();

    if (concatenated) {
      return concatenated;
    }
  }

  return (
    extractTextFromValue(
      record.output ??
        record.response ??
        record.text ??
        record.content ??
        record.message ??
        choices?.[0]?.message?.content ??
        choices?.[0]?.delta?.content,
    ) || ''
  );
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return '';

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function validateBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).toString().replace(/\/$/, '');
  } catch {
    throw new Error(
      `Invalid GEMMA_BASE_URL: "${baseUrl}". Use http://localhost:11434 or an OpenAI-compatible endpoint such as http://localhost:8000/v1.`,
    );
  }
}

export function getGemmaChatCompletionsUrl(
  baseUrl: string = getGemmaConfig().baseUrl,
): string {
  const normalizedBaseUrl = validateBaseUrl(baseUrl);
  const url = new URL(normalizedBaseUrl);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (pathname.endsWith('/chat/completions')) {
    return url.toString().replace(/\/$/, '');
  }

  if (pathname.endsWith('/v1')) {
    url.pathname = `${pathname}/chat/completions`;
  } else if (pathname === '' || pathname === '/') {
    url.pathname = '/v1/chat/completions';
  } else {
    url.pathname = `${pathname}/chat/completions`;
  }

  return url.toString().replace(/\/$/, '');
}

export async function testGemmaReachability(
  config: GemmaClientConfig = getGemmaConfig(),
) {
  const normalizedBaseUrl = validateBaseUrl(config.baseUrl);
  const provider = getGemmaProvider(normalizedBaseUrl);
  const lmStudioChatUrl =
    config.chatUrl && isLmStudioChatEndpoint(config.chatUrl)
      ? validateBaseUrl(config.chatUrl)
      : isLikelyLmStudioBaseUrl(normalizedBaseUrl)
        ? joinUrl(normalizedBaseUrl, '/api/v1/chat')
        : null;

  const url =
    lmStudioChatUrl ||
    joinUrl(normalizedBaseUrl, provider === 'ollama' ? '/api/tags' : '/models');

  let requestInit: RequestInit;
  if (
    (config.chatUrl && isLmStudioChatEndpoint(config.chatUrl)) ||
    isLikelyLmStudioBaseUrl(normalizedBaseUrl)
  ) {
    requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        system_prompt: GEMMA_PERSONA,
        input: 'Reply with ok.',
        stream: false,
      }),
    };
  } else {
    requestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    };
  }

  const response = await fetchWithTimeout(url, requestInit, config.timeoutMs);

  if (!response.ok) {
    const body = await readJsonOrText(response).catch(() => '');
    throw new Error(
      `Gemma endpoint check failed with ${response.status} ${response.statusText}${body ? `: ${typeof body === 'string' ? body : JSON.stringify(body)}` : ''}`,
    );
  }

  return {
    ok: true,
    provider,
    baseUrl: normalizedBaseUrl,
    model: config.model,
  } as const;
}

export async function chatWithGemma(
  messages: GemmaMessage[],
  config: GemmaClientConfig = getGemmaConfig(),
): Promise<GemmaChatResult> {
  const normalizedBaseUrl = validateBaseUrl(config.baseUrl);
  const provider = getGemmaProvider(normalizedBaseUrl);
  const personaMessage: GemmaMessage = {
    role: 'system',
    content: GEMMA_PERSONA,
  };
  const requestMessages = [personaMessage, ...messages];
  const url = getChatUrl(config);
  const isLmStudioChat = isLmStudioChatEndpoint(url);
  const body = provider === 'ollama'
    ? {
        model: config.model,
        messages: requestMessages,
        stream: false,
      }
    : isLmStudioChat
      ? {
          model: config.model,
          system_prompt: GEMMA_PERSONA,
          input: stringifyConversation(messages),
          stream: false,
        }
      : {
          model: config.model,
          messages: requestMessages,
          stream: false,
        };

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    config.timeoutMs,
  );

  const raw = await readJsonOrText(response);

  if (!response.ok) {
    throw new Error(
      `Gemma chat request failed with ${response.status} ${response.statusText}: ${
        typeof raw === 'string' ? raw : JSON.stringify(raw)
      }`,
    );
  }

  let text = '';
  if (provider === 'ollama') {
    text = normalizeText(
      (raw as { message?: { content?: unknown } })?.message?.content,
    );
  } else if (isLmStudioChat) {
    text = extractChatText(raw);
  } else {
    text = normalizeText(
      (raw as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
        ?.message?.content,
    );
  }

  text = sanitizeGemmaResponseText(text);

  return {
    provider,
    model: config.model,
    text,
    raw,
  };
}
