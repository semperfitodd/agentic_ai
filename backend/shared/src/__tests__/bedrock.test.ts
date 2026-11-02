import { describe, it, expect, beforeEach } from 'vitest';

import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { invokeModel, parseModelJson } from '../bedrock';

const bedrockMock = mockClient(BedrockRuntimeClient);

beforeEach(() => {
  bedrockMock.reset();
  process.env.BEDROCK_MODEL_ID = 'us.amazon.nova-2-lite-v1:0';
});

describe('invokeModel', () => {
  it('sends a Converse request with the system prompt and token limit', async () => {
    bedrockMock.on(ConverseCommand).resolves({
      stopReason: 'end_turn',
      output: { message: { role: 'assistant', content: [{ text: 'ok' }] } },
    });
    await invokeModel({ system: 'You are a reviewer.', user: 'Analyze this PR' });

    const input = bedrockMock.commandCalls(ConverseCommand)[0].args[0].input;
    expect(input.modelId).toBe('us.amazon.nova-2-lite-v1:0');
    expect(input.system).toEqual([{ text: 'You are a reviewer.' }]);
    expect(input.messages).toEqual([{ role: 'user', content: [{ text: 'Analyze this PR' }] }]);
    expect(input.inferenceConfig).toEqual({ maxTokens: 16000 });
  });

  it('omits system when none is given', async () => {
    bedrockMock.on(ConverseCommand).resolves({
      stopReason: 'end_turn',
      output: { message: { role: 'assistant', content: [{ text: 'ok' }] } },
    });
    await invokeModel({ user: 'x' });
    expect(bedrockMock.commandCalls(ConverseCommand)[0].args[0].input.system).toBeUndefined();
  });

  it('returns the first text block', async () => {
    bedrockMock.on(ConverseCommand).resolves({
      stopReason: 'end_turn',
      output: { message: { role: 'assistant', content: [{ text: '{"summary":"done"}' }] } },
    });
    await expect(invokeModel({ user: 'x' })).resolves.toBe('{"summary":"done"}');
  });

  it('throws when a guardrail or content filter blocks the response', async () => {
    bedrockMock.on(ConverseCommand).resolves({
      stopReason: 'content_filtered',
      output: { message: { role: 'assistant', content: [] } },
    });
    await expect(invokeModel({ user: 'x' })).rejects.toThrow('Model declined the request');
  });

  it('throws when no text is returned', async () => {
    bedrockMock.on(ConverseCommand).resolves({
      stopReason: 'max_tokens',
      output: { message: { role: 'assistant', content: [] } },
    });
    await expect(invokeModel({ user: 'x' })).rejects.toThrow('max_tokens');
  });
});

describe('parseModelJson', () => {
  it('parses JSON wrapped in a markdown code fence', () => {
    expect(parseModelJson<{ ok: boolean }>('```json\n{"ok": true}\n```')).toEqual({ ok: true });
  });
});
