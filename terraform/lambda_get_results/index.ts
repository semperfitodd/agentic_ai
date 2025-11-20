import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sfnClient = new SFNClient({ region: process.env.AWS_REGION });

export const handler = async (event: any) => {
  console.log('Get results request:', JSON.stringify(event, null, 2));

  const bucketName = process.env.RESULTS_BUCKET;
  if (!bucketName) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'RESULTS_BUCKET environment variable is not set',
      }),
    };
  }

  try {
    const pathParams = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};
    
    // Option 1: Get by execution ARN
    if (queryParams.executionArn) {
      const execution = await sfnClient.send(
        new DescribeExecutionCommand({
          executionArn: queryParams.executionArn,
        })
      );

      const response: any = {
        executionArn: execution.executionArn,
        status: execution.status,
        startDate: execution.startDate?.toISOString(),
        stopDate: execution.stopDate?.toISOString(),
      };

      if (execution.status === 'SUCCEEDED' && execution.output) {
        const output = JSON.parse(execution.output);
        response.result = output.body;
      } else if (execution.status === 'FAILED') {
        response.error = execution.error;
        response.cause = execution.cause;
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      };
    }

    // Option 2: List recent reports
    if (queryParams.list) {
      const listResponse = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: 'reports/',
          MaxKeys: 50,
        })
      );

      const reports = (listResponse.Contents || [])
        .filter(obj => obj.Key?.endsWith('.json'))
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
        .map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          url: `${process.env.API_URL}/results?key=${encodeURIComponent(obj.Key || '')}`,
        }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          reports,
          count: reports.length,
        }),
      };
    }

    // Option 3: Get by S3 key
    if (queryParams.key) {
      const getResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: queryParams.key,
        })
      );

      const body = await getResponse.Body?.transformToString();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: body || JSON.stringify({ error: 'No content' }),
      };
    }

    // No valid parameters
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Missing required parameter',
        usage: {
          byExecution: '?executionArn=arn:aws:states:...',
          listRecent: '?list=true',
          byKey: '?key=reports/sprint-name/timestamp.json',
        },
      }),
    };
  } catch (error: any) {
    console.error('Error retrieving results:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error.message || 'Failed to retrieve results',
      }),
    };
  }
};

