import { describe, it, expect, beforeEach } from 'vitest';

import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { invokeClaude } from '../bedrock';

const bedrockMock = mockClient(BedrockRuntimeClient);

const respond = (body: unknown) =>
  bedrockMock.on(InvokeModelCommand).resolves({ body: new TextEncoder().encode(JSON.stringify(body)) as never });

beforeEach(() => {
  bedrockMock.reset();
  process.env.BEDROCK_MODEL_ID = 'us.anthropic.claude-haiku-5-5';
});

describe('invokeClaude', () => {
  it('sends the system prompt top-level and no sampling parameters', async () => {
    respond({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] });
    await invokeClaude({ system: 'You are a reviewer.', user: 'Analyze this PR' });

    const input = bedrockMock.commandCalls(InvokeModelCommand)[0].args[0].input;
    expect(input.modelId).toBe('us.anthropic.claude-haiku-5-5');
    const body = JSON.parse(input.body as string);
    expect(body.system).toBe('You are a reviewer.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Analyze this PR' }]);
    expect(body.temperature).toBeUndefined();
    expect(body.max_tokens).toBe(16000);
  });

  it('returns the text block when thinking blocks come first', async () => {
    respond({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: '{"summary":"done"}' },
      ],
    });
    await expect(invokeClaude({ user: 'x' })).resolves.toBe('{"summary":"done"}');
  });

  it('throws on a refusal', async () => {
    respond({ stop_reason: 'refusal', content: [] });
    await expect(invokeClaude({ user: 'x' })).rejects.toThrow('Model declined the request');
  });

  it('throws when no text block is returned', async () => {
    respond({ stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '' }] });
    await expect(invokeClaude({ user: 'x' })).rejects.toThrow('max_tokens');
  });
});
