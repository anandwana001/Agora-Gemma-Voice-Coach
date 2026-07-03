import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { getMissingAgoraServerMessage } from '@/lib/runtime-config';

const EXPIRATION_TIME_IN_SECONDS = 3600;

function generateChannelName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ai-conversation-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  const missingMessage = getMissingAgoraServerMessage();
  if (missingMessage) {
    return NextResponse.json(
      { error: missingMessage },
      { status: 500 },
    );
  }

  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!.trim();
  const APP_CERTIFICATE = process.env.NEXT_AGORA_APP_CERTIFICATE!.trim();

  const { searchParams } = new URL(request.url);
  const uidStr = searchParams.get('uid');
  const parsedUid = uidStr ? parseInt(uidStr, 10) : Number.NaN;
  const uid =
    Number.isNaN(parsedUid) || parsedUid <= 0
      ? Math.floor(Math.random() * 9_999_000) + 1000
      : parsedUid;
  const channelName = searchParams.get('channel') || generateChannelName();
  const expirationTime =
    Math.floor(Date.now() / 1000) + EXPIRATION_TIME_IN_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid.toString(),
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime,
    );

    return NextResponse.json({
      token,
      uid: uid.toString(),
      channel: channelName,
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Agora token',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
