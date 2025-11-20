import { SFNClient, StartSyncExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION });

export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    
    if (!stateMachineArn) {
      throw new Error('STATE_MACHINE_ARN environment variable is not set');
    }

    // Parse the body if it's a string
    const input = typeof event.body === 'string' ? event.body : JSON.stringify(event.body || {});

    const command = new StartSyncExecutionCommand({
      stateMachineArn,
      input,
    });

    const response = await sfnClient.send(command);

    return {
      statusCode: response.status === 'SUCCEEDED' ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: response.output || JSON.stringify({ message: 'Workflow executed', status: response.status }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Error executing workflow',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

