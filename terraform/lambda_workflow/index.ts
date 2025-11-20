import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

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

    // Generate unique execution name
    const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const command = new StartExecutionCommand({
      stateMachineArn,
      input,
      name: executionName,
    });

    const response = await sfnClient.send(command);

    // Return immediately with execution details
    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Sprint analysis started',
        executionArn: response.executionArn,
        executionName: executionName,
        startDate: response.startDate?.toISOString(),
        status: 'RUNNING',
        statusUrl: `https://console.aws.amazon.com/states/home?region=${process.env.AWS_REGION}#/executions/details/${response.executionArn}`,
        note: 'This is an asynchronous operation. The analysis may take several minutes to complete. Check CloudWatch Logs or Step Functions console for results.',
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Error executing workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

