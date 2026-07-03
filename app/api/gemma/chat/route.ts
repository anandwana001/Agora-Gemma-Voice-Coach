import { NextRequest, NextResponse } from 'next/server';
import {
  chatWithGemma,
  getGemmaConfig,
  type GemmaMessage,
} from '@/lib/gemma-client';

type ChatRequestBody = {
  messages?: Array<Partial<GemmaMessage>>;
};

export async function POST(request: NextRequest) {
  try {
    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Send a messages array.' },
        { status: 400 },
      );
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];

    const normalizedMessages: GemmaMessage[] = messages
      .filter((message): message is GemmaMessage => {
        return (
          !!message &&
          typeof message.role === 'string' &&
          typeof message.content === 'string' &&
          message.role !== 'system'
        );
      })
      .map((message) => ({
        role: message.role as GemmaMessage['role'],
        content: message.content,
      }));

    const result = await chatWithGemma(normalizedMessages, getGemmaConfig());

    return NextResponse.json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gemma chat failed. Check that the local model endpoint is running and reachable.',
      },
      { status: 500 },
    );
  }
}
