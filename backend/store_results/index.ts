import { logger, stepResponse, toPublicError } from '@sprint/shared';

interface StoreResultsInput {
  statusCode: number;
  body: {
    sprintName?: string;
    since: string;
    until: string;
    repos: Array<{ owner: string; repo: string }>;
    totalPRs: number;
    markdownS3Key?: string;
    s3Bucket?: string;
    generatedAt: string;
    skippedAnalyses?: number;
  };
}

export const handler = async (event: StoreResultsInput) => {
  logger.info('Preparing final response with markdown S3 location');

  try {
    if (!event.body.markdownS3Key || !event.body.s3Bucket) {
      throw new Error('Markdown S3 key and bucket are required');
    }

    logger.info('Markdown report location', { bucket: event.body.s3Bucket, key: event.body.markdownS3Key });

    return stepResponse(200, {
      sprintName: event.body.sprintName,
      since: event.body.since,
      until: event.body.until,
      totalPRs: event.body.totalPRs,
      s3Location: {
        bucket: event.body.s3Bucket,
        markdownKey: event.body.markdownS3Key,
      },
    });
  } catch (error) {
    logger.error('Error preparing final response', toPublicError(error));
    return stepResponse(500, {
      ...toPublicError(error),
      sprintName: event.body.sprintName,
      since: event.body.since,
      until: event.body.until,
      totalPRs: event.body.totalPRs,
    });
  }
};
