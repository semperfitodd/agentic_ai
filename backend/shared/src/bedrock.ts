import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { requireEnv } from './env';

export const bedrockClient = new BedrockRuntimeClient({});

export interface ModelOptions {
  modelId?: string;
  system?: string;
  user: string;
  maxTokens?: number;
}

const DECLINED_STOP_REASONS = new Set(['guardrail_intervened', 'content_filtered']);

export async function invokeModel(options: ModelOptions): Promise<string> {
  const modelId = options.modelId ?? requireEnv('BEDROCK_MODEL_ID');
  const maxTokens = options.maxTokens ?? parseInt(process.env.BEDROCK_MAX_TOKENS ?? '16000', 10);

  const response = await bedrockClient.send(
    new ConverseCommand({
      modelId,
      ...(options.system ? { system: [{ text: options.system }] } : {}),
      messages: [{ role: 'user', content: [{ text: options.user }] }],
      inferenceConfig: { maxTokens },
    })
  );

  const stopReason = response.stopReason ?? 'unknown';
  if (DECLINED_STOP_REASONS.has(stopReason)) {
    throw new Error('Model declined the request');
  }
  const text = response.output?.message?.content?.find((block) => block.text)?.text;
  if (!text) throw new Error(`Model returned no text content (stopReason: ${stopReason})`);
  return text;
}

export function parseModelJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('No valid JSON object found in model response');
    }
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as T;
  }
}
