import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event: any) => {
  console.log('Get markdown request:', JSON.stringify(event, null, 2));

  const bucketName = process.env.RESULTS_BUCKET;
  if (!bucketName) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'RESULTS_BUCKET not configured',
      }),
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const { key } = queryParams;

    if (!key) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing required parameter: key',
        }),
      };
    }

    console.log(`Fetching markdown from S3: ${bucketName}/${key}`);

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    const markdown = await response.Body?.transformToString();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Access-Control-Allow-Origin': '*',
      },
      body: markdown || '',
    };
  } catch (error: any) {
    console.error('Error fetching markdown:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error.message || 'Failed to fetch markdown',
      }),
    };
  }
};

