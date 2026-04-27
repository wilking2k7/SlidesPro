import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client (S3 compatible). Subir buffers binarios y obtener URL.
 *
 * En desarrollo, si las variables R2 no están configuradas, las funciones
 * caen a un modo "data URI" que persiste todo en memoria como base64
 * (suficiente para probar el pipeline sin tener que pagar nada).
 */

const required = (name: string) => process.env[name];

export function r2IsConfigured(): boolean {
  return !!(
    required("R2_ACCOUNT_ID") &&
    required("R2_ACCESS_KEY_ID") &&
    required("R2_SECRET_ACCESS_KEY") &&
    required("R2_BUCKET")
  );
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _client;
}

export type UploadResult = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export async function uploadBuffer(opts: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<UploadResult> {
  if (!r2IsConfigured()) {
    // Fallback: data URI (for local dev without R2)
    const url = `data:${opts.contentType};base64,${opts.buffer.toString("base64")}`;
    return {
      key: opts.key,
      url,
      size: opts.buffer.length,
      contentType: opts.contentType,
    };
  }

  const bucket = process.env.R2_BUCKET!;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.buffer,
      ContentType: opts.contentType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL ?? `https://${bucket}.r2.dev`;
  const url = `${publicBase.replace(/\/$/, "")}/${opts.key}`;
  return { key: opts.key, url, size: opts.buffer.length, contentType: opts.contentType };
}

export function makeAssetKey(opts: {
  workspaceId: string;
  presentationId: string;
  kind: string;
  ext: string;
}): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `workspaces/${opts.workspaceId}/presentations/${opts.presentationId}/${opts.kind}/${stamp}-${rand}.${opts.ext}`;
}
