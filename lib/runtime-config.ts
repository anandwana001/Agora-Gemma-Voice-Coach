type RequiredEnvOptions = {
  label?: string;
  valueHint?: string;
};

export function getRequiredEnv(name: string, options: RequiredEnvOptions = {}) {
  const value = process.env[name]?.trim();
  if (value) return value;

  const label = options.label ?? name;
  const valueHint = options.valueHint ? ` ${options.valueHint}` : '';
  throw new Error(`Missing ${label}. Set ${name} in .env.local.${valueHint}`);
}

export function getOptionalTrimmedEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getMissingAgoraClientMessage(): string | null {
  return process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim()
    ? null
    : 'Agora App ID is missing. Add NEXT_PUBLIC_AGORA_APP_ID to .env.local before starting a session.';
}

export function getMissingAgoraServerMessage(): string | null {
  if (process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim() && process.env.NEXT_AGORA_APP_CERTIFICATE?.trim()) {
    return null;
  }
  return 'Agora credentials are missing. Add NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE to .env.local.';
}
