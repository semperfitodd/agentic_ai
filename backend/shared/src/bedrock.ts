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
  temperature?: number;
}

export async function invokeClaude(options: ClaudeOptions): Promise<string> {
  const modelId = options.modelId ?? requireEnv('BEDROCK_MODEL_ID');
  const maxTokens = options.maxTokens ?? parseInt(process.env.BEDROCK_MAX_TOKENS ?? '4096', 10);
  const temperature = options.temperature ?? parseFloat(process.env.BEDROCK_TEMPERATURE ?? '0.7');
  const anthropicVersion = process.env.BEDROCK_ANTHROPIC_VERSION ?? 'bedrock-2023-05-31';

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) {
    messages.push({ role: 'user', content: options.system });
    messages.push({ role: 'assistant', content: 'Understood.' });
  }
  messages.push({ role: 'user', content: options.user });

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: anthropicVersion,
      max_tokens: maxTokens,
      temperature,
      messages,
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text as string;
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
