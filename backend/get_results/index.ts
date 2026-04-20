import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { requireEnv, logger, apiResponse, toPublicError, getJson, getText, listObjects } from '@sprint/shared';

const sfnClient = new SFNClient({});

export const handler = async (event: { queryStringParameters?: Record<string, string> }) => {
  const bucketName = requireEnv('RESULTS_BUCKET');
  const queryParams = event.queryStringParameters ?? {};

  logger.info('Get results request', { query: Object.keys(queryParams) });

  try {
    if (queryParams.executionArn) {
      const execution = await sfnClient.send(
        new DescribeExecutionCommand({ executionArn: queryParams.executionArn })
      );

      const response: Record<string, unknown> = {
        executionArn: execution.executionArn,
        status: execution.status,
        startDate: execution.startDate?.toISOString(),
        stopDate: execution.stopDate?.toISOString(),
      };

      if (execution.status === 'SUCCEEDED' && execution.output) {
        try {
          response.output = JSON.parse(execution.output);
        } catch {
          response.rawOutput = execution.output;
        }
      } else if (execution.status === 'FAILED') {
        response.error = execution.error;
        response.cause = execution.cause;
      }

      return apiResponse(200, response);
    }

    if (queryParams.list) {
      const maxKeys = parseInt(process.env.MAX_REPORTS_LIST ?? '50', 10);
      const apiUrl = requireEnv('API_URL');

      const objects = await listObjects(bucketName, 'reports/', maxKeys);
      const reports = objects
        .filter((obj) => obj.key?.endsWith('.md'))
        .sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0))
        .map((obj) => ({
          key: obj.key,
          size: obj.size,
          lastModified: obj.lastModified?.toISOString(),
          url: `${apiUrl}/results?key=${encodeURIComponent(obj.key ?? '')}`,
        }));

      return apiResponse(200, { reports, count: reports.length });
    }

    if (queryParams.key) {
      const body = await getText(bucketName, queryParams.key);
      return apiResponse(200, JSON.parse(body || '{}'));
    }

    return apiResponse(400, {
      error: 'Missing required parameter',
      usage: {
        byExecution: '?executionArn=arn:aws:states:...',
        listRecent: '?list=true',
        byKey: '?key=reports/sprint-name/timestamp.md',
      },
    });
  } catch (error) {
    logger.error('Error retrieving results', toPublicError(error));
    return apiResponse(500, toPublicError(error));
  }
};
