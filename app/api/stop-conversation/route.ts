import { NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';
import { StopConversationRequest } from '@/types/conversation';
import { getMissingAgoraServerMessage, getRequiredEnv } from '@/lib/runtime-config';

function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeErr = error as {
    statusCode?: number;
    body?: { detail?: string; reason?: string };
    message?: string;
  };

  const statusCode = maybeErr.statusCode;
  const reason = maybeErr.body?.reason?.toLowerCase();
  const detail =
    maybeErr.body?.detail?.toLowerCase() ?? maybeErr.message?.toLowerCase() ?? '';

  if (statusCode === 404) return true;
  if (
    reason === 'invalidrequest' &&
    detail.includes('already in the process of shutting down')
  ) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    let body: StopConversationRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Send agent_id.' },
        { status: 400 },
      );
    }

    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 },
      );
    }

    const missingMessage = getMissingAgoraServerMessage();
    if (missingMessage) {
      throw new Error(missingMessage);
    }

    const appId = getRequiredEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = getRequiredEnv('NEXT_AGORA_APP_CERTIFICATE');

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    try {
      await client.stopAgent(agent_id);
    } catch (error) {
      if (isAgentAlreadyStoppingOrStopped(error)) {
        return NextResponse.json({ success: true, state: 'already-stopping' });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to stop conversation',
      },
      { status: 500 },
    );
  }
}
