import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  CustomLLM,
} from 'agora-agents';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { getMissingAgoraServerMessage, getRequiredEnv } from '@/lib/runtime-config';
import {
  getGemmaChatCompletionsUrl,
  getGemmaConfig,
  getGemmaPersona,
} from '@/lib/gemma-client';

const SYSTEM_PROMPT = getGemmaPersona();

const GREETING =
  process.env.NEXT_AGENT_GREETING ??
  `Hi, I’m Gemma. What are we working through today?`;

const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);
const gemmaConfig = getGemmaConfig();
const gemmaChatUrl =
  process.env.GEMMA_PUBLIC_CHAT_URL?.trim() ||
  getGemmaChatCompletionsUrl(gemmaConfig.baseUrl);
const gemmaApiKey = process.env.GEMMA_API_KEY?.trim() || 'local-gemma';

function requireEnv(name: string): string {
  return getRequiredEnv(name);
}

export async function POST(request: NextRequest) {
  try {
    let body: ClientStartRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Send requester_id and channel_name.' },
        { status: 400 },
      );
    }

    const { requester_id, channel_name } = body;

    const missingMessage = getMissingAgoraServerMessage();
    if (missingMessage) {
      return NextResponse.json({ error: missingMessage }, { status: 500 });
    }

    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const agent = new Agent({
      client,
      instructions: SYSTEM_PROMPT,
      greeting: GREETING,
      failureMessage: 'Please wait a moment.',
      maxHistory: 50,
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'en',
        }),
      )
      .withLlm(
        new CustomLLM({
          apiKey: gemmaApiKey,
          url: gemmaChatUrl,
          model: gemmaConfig.model,
          systemMessages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
          ],
        }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
      );

    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
