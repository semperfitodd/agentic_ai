import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

export const s3Client = new S3Client({});

export async function putJson(bucket: string, key: string, data: unknown, metadata?: Record<string, string>): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
      Metadata: metadata,
    })
  );
}

export async function putMarkdown(bucket: string, key: string, body: string, metadata?: Record<string, string>): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/markdown',
      Metadata: metadata,
    })
  );
}

export async function getJson<T = unknown>(bucket: string, key: string): Promise<T> {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const body = await response.Body?.transformToString();
  if (!body) throw new Error(`Empty body at s3://${bucket}/${key}`);
  return JSON.parse(body) as T;
}

export async function getText(bucket: string, key: string): Promise<string> {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  return (await response.Body?.transformToString()) ?? '';
}

export async function listLatestKey(bucket: string, prefix: string): Promise<string | null> {
  const response = await s3Client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1 })
  );
  return response.Contents?.[0]?.Key ?? null;
}

export interface S3Object {
  key?: string;
  size?: number;
  lastModified?: Date;
}

export async function listObjects(bucket: string, prefix: string, maxKeys = 50): Promise<S3Object[]> {
  const response = await s3Client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: maxKeys })
  );
  return (response.Contents ?? []).map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));
}
