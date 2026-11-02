import {
  requireEnv,
  logger,
  apiResponse,
  apiTextResponse,
  toPublicError,
  getText,
  requireCallerUsername,
  assertOwnedKey,
  AppError,
  JwtAuthorizerContext,
} from '@sprint/shared';

type GetMarkdownEvent = JwtAuthorizerContext & { queryStringParameters?: Record<string, string> };

export const handler = async (event: GetMarkdownEvent) => {
  const bucketName = requireEnv('RESULTS_BUCKET');
  const queryParams = event.queryStringParameters ?? {};

  logger.info('Get markdown request', { key: queryParams.key });

  try {
    const ownerId = requireCallerUsername(event);
    const { key } = queryParams;
    if (!key) {
      return apiResponse(400, { error: 'Missing required parameter: key' });
    }

    assertOwnedKey(ownerId, key);
    const markdown = await getText(bucketName, key);
    return apiTextResponse(200, markdown);
  } catch (error) {
    if (error instanceof AppError) {
      return apiResponse(error.statusCode, toPublicError(error));
    }
    logger.error('Error fetching markdown', toPublicError(error));
    return apiResponse(500, toPublicError(error));
  }
};
