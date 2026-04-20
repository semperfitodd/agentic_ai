import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { requireEnv, logger, apiResponse, toPublicError } from '@sprint/shared';

const sfnClient = new SFNClient({});

export const handler = async (event: { body?: string | Record<string, unknown> }) => {
  try {
    const stateMachineArn = requireEnv('STATE_MACHINE_ARN');
    const input = typeof event.body === 'string' ? event.body : JSON.stringify(event.body ?? {});
    const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const response = await sfnClient.send(
      new StartExecutionCommand({ stateMachineArn, input, name: executionName })
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
