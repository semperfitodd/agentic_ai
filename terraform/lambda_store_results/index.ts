import { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

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
  console.log('Preparing final response with markdown S3 location');

  try {
    if (!event.body.markdownS3Key || !event.body.s3Bucket) {
      throw new Error('Markdown S3 key and bucket are required');
    }

    console.log(`Markdown report stored at: s3://${event.body.s3Bucket}/${event.body.markdownS3Key}`);

    return {
      statusCode: 200,
      body: {
        sprintName: event.body.sprintName,
        since: event.body.since,
        until: event.body.until,
        totalPRs: event.body.totalPRs,
        s3Location: {
          bucket: event.body.s3Bucket,
          markdownKey: event.body.markdownS3Key,
        },
      },
    };
  } catch (error: any) {
    console.error('Error preparing final response:', error);
    return {
      statusCode: 500,
      body: {
        error: error.message,
        sprintName: event.body.sprintName,
        since: event.body.since,
        until: event.body.until,
        totalPRs: event.body.totalPRs,
      },
    };
  }
};

