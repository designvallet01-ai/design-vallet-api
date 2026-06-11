import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isMock = process.env.AWS_ACCESS_KEY_ID === 'mock_access_key' || !process.env.AWS_ACCESS_KEY_ID;

let s3Client = null;

if (!isMock) {
  const s3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  // Support custom endpoint for Cloudflare R2
  if (process.env.AWS_S3_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
    s3Config.forcePathStyle = true; // Often required for R2
  }

  s3Client = new S3Client(s3Config);
  console.log('✅ S3 Client Initialized.');
} else {
  console.log('⚠️ S3 credentials are set to mock. Using local folder storage mock for uploads/downloads.');
  
  // Make sure mockup upload folders exist inside workspace
  const mockStorageOriginals = path.join(__dirname, '../../mock_storage/originals');
  const mockStoragePreviews = path.join(__dirname, '../../mock_storage/previews');
  
  fs.mkdirSync(mockStorageOriginals, { recursive: true });
  fs.mkdirSync(mockStoragePreviews, { recursive: true });
}

/**
 * Uploads a file stream/buffer to S3 or mock local storage
 */
export async function uploadToStorage(fileBuffer, key, mimeType, isPrivate = true) {
  const bucketName = isPrivate ? process.env.S3_PRIVATE_BUCKET : process.env.S3_PUBLIC_BUCKET;

  if (isMock) {
    // Write directly to local workspace mock storage
    const targetDir = isPrivate ? 'originals' : 'previews';
    const filePath = path.join(__dirname, '../../mock_storage', targetDir, path.basename(key));
    fs.writeFileSync(filePath, fileBuffer);
    console.log(`[MOCK STORAGE] Uploaded to local folder: ${filePath}`);
    return `mock://storage/${targetDir}/${path.basename(key)}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Generates a secure presigned URL for downloading the original file (expiring in seconds)
 */
export async function getDownloadUrl(key, expiresSeconds = 300, host = null, protocol = 'http') {
  if (isMock) {
    // Return a local backend endpoint that pipes the file directly
    // This allows testing the entire secure download cycle offline!
    const keyName = path.basename(key);
    const resolvedHost = host || `localhost:${process.env.PORT || 5000}`;
    return `${protocol}://${resolvedHost}/api/images/mock-download/${keyName}?token=temp_signed_mock_token`;
  }

  const bucketName = process.env.S3_PRIVATE_BUCKET;
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  // Generates S3 presigned URL expiring in expiresSeconds (e.g. 5 minutes)
  return await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
}

export { s3Client };
