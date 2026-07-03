import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  chatWithGemma,
  getGemmaConfig,
  sanitizeGemmaResponseText,
  type GemmaMessage,
} from '@/lib/gemma-client';

type ChatBody = {
  messages?: Array<Partial<GemmaMessage>>;
};

function normalizeMessages(messages: Array<Partial<GemmaMessage>>): GemmaMessage[] {
  return messages
    .filter((message): message is GemmaMessage => {
      return (
        !!message &&
        typeof message.role === 'string' &&
        typeof message.content === 'string'
      );
    })
    .map((message) => ({
      role: message.role as GemmaMessage['role'],
      content: message.content,
    }))
    .filter((message) => message.role !== 'system');
}

function encodeSseChunk(
  encoder: TextEncoder,
  payload: Record<string, unknown>,
): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 },
      );
    }

    const messages = normalizeMessages(body.messages ?? []);

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error:
            'At least one user or assistant message is required to generate a response.',
        },
        { status: 400 },
      );
    }

    const result = await chatWithGemma(messages, getGemmaConfig());
    const finalText =
      sanitizeGemmaResponseText(result.text) ||
      'I’m having trouble reading the model response right now. Please try again.';
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encodeSseChunk(encoder, {
            id,
            object: 'chat.completion.chunk',
            created,
            model: result.model,
            choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
          }),
        );

        if (finalText) {
          controller.enqueue(
            encodeSseChunk(encoder, {
              id,
              object: 'chat.completion.chunk',
              created,
              model: result.model,
              choices: [{ index: 0, delta: { content: finalText }, finish_reason: null }],
            }),
          );
        }

        controller.enqueue(
          encodeSseChunk(encoder, {
            id,
            object: 'chat.completion.chunk',
            created,
            model: result.model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Gemma chat completion failed',
      },
      { status: 500 },
    );
  }
}
