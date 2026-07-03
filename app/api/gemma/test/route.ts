import { NextResponse } from 'next/server';
import { getGemmaConfig, testGemmaReachability } from '@/lib/gemma-client';

export async function GET() {
  try {
    const config = getGemmaConfig();
    const result = await testGemmaReachability(config);

    return NextResponse.json({
      reachable: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        reachable: false,
        error:
          error instanceof Error
            ? error.message
            : 'Gemma endpoint is unreachable. Make sure Ollama or your local OpenAI-compatible server is running.',
      },
      { status: 502 },
    );
  }
}
