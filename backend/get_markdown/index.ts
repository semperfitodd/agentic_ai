import { requireEnv, logger, apiResponse, apiTextResponse, toPublicError, getText } from '@sprint/shared';

export const handler = async (event: { queryStringParameters?: Record<string, string> }) => {
  const bucketName = requireEnv('RESULTS_BUCKET');
  const queryParams = event.queryStringParameters ?? {};

  logger.info('Get markdown request', { key: queryParams.key });

  try {
    const { key } = queryParams;
    if (!key) {
      return apiResponse(400, { error: 'Missing required parameter: key' });
    }

    const markdown = await getText(bucketName, key);
    return apiTextResponse(200, markdown);
  } catch (error) {
    logger.error('Error fetching markdown', toPublicError(error));
    return apiResponse(500, toPublicError(error));
  }
};
