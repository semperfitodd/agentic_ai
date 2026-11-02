import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { requireEnv } from './env';

export const bedrockClient = new BedrockRuntimeClient({});

export interface ClaudeOptions {
  modelId?: string;
  system?: string;
  user: string;
  maxTokens?: number;
}

interface ClaudeResponse {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
}

export async function invokeClaude(options: ClaudeOptions): Promise<string> {
  const modelId = options.modelId ?? requireEnv('BEDROCK_MODEL_ID');
  const maxTokens = options.maxTokens ?? parseInt(process.env.BEDROCK_MAX_TOKENS ?? '16000', 10);
  const anthropicVersion = process.env.BEDROCK_ANTHROPIC_VERSION ?? 'bedrock-2023-05-31';

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: anthropicVersion,
      max_tokens: maxTokens,
      ...(options.system ? { system: options.system } : {}),
      messages: [{ role: 'user', content: options.user }],
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as ClaudeResponse;
  if (responseBody.stop_reason === 'refusal') {
    throw new Error('Model declined the request');
  }
  const text = responseBody.content?.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error(`Model returned no text content (stop_reason: ${responseBody.stop_reason ?? 'unknown'})`);
  return text;
}

export function parseJsonFromClaude<T>(raw: string): T {
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
