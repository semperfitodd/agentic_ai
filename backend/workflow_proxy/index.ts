import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { requireEnv, logger, apiResponse, toPublicError, encryptGithubToken } from '@sprint/shared';

const sfnClient = new SFNClient({});

function parseBody(body: string | Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (body === undefined || body === null) return {};
  if (typeof body !== 'string') return body;
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const handler = async (event: { body?: string | Record<string, unknown> }) => {
  try {
    const stateMachineArn = requireEnv('STATE_MACHINE_ARN');
    const body = parseBody(event.body);
    if (!body) return apiResponse(400, { error: 'Request body must be a JSON object' });

    const { githubToken, ...rest } = body;
    const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const encryptedGithubToken = await encryptGithubToken(
      typeof githubToken === 'string' ? githubToken : undefined,
      executionName
    );

    const response = await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify({ ...rest, encryptedGithubToken }),
        name: executionName,
      })
    );

    logger.info('Execution started', { executionArn: response.executionArn });

    return apiResponse(202, {
      message: 'Sprint analysis started',
      executionArn: response.executionArn,
      executionName,
      startDate: response.startDate?.toISOString(),
      status: 'RUNNING',
    });
  } catch (error) {
    logger.error('Failed to start execution', { message: error instanceof Error ? error.message : 'unknown' });
    return apiResponse(500, toPublicError(error));
  }
};
