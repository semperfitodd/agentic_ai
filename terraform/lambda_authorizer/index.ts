import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface AuthorizerEvent {
  headers?: {
    [key: string]: string;
  };
  requestContext?: {
    [key: string]: any;
  };
}

interface AuthorizerResponse {
  isAuthorized: boolean;
  context?: {
    user?: string;
  };
}

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });
    
    const response = await secretsManager.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret string is empty');
    }
    
    const secret = JSON.parse(response.SecretString);
    return secret.API_KEY;
  } catch (error: any) {
    console.error('Error fetching secret:', error);
    throw new Error('Failed to retrieve API key secret');
  }
}

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResponse> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const secretName = process.env.API_KEY_SECRET;
    if (!secretName) {
      console.error('Missing environment variable: API_KEY_SECRET');
      throw new Error('API_KEY_SECRET environment variable is not set');
    }

    const apiKeySecret = await getSecret(secretName);

    const headers = event.headers || {};
    
    // API Gateway v2 sends headers in lowercase
    const clientKey = headers['x-api-key'] || headers['X-Api-Key'];

    if (clientKey && clientKey.trim() === apiKeySecret.trim()) {
      console.log('Authorization succeeded');
      
      // Extract user from headers if available
      const userEmail = headers['x-user-email'] || headers['X-User-Email'] || '';
      
      return {
        isAuthorized: true,
        context: {
          user: userEmail,
        },
      };
    } else {
      console.log('Authorization failed');
      return {
        isAuthorized: false,
      };
    }
  } catch (error: any) {
    console.error('Unexpected error in authorizer:', error);
    return {
      isAuthorized: false,
    };
  }
};

