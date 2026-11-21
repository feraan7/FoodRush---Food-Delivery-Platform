import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';

// Directory for local file storage fallback
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

interface UploadResult {
  url: string;
  publicId?: string;
}

export async function uploadImage(dataUriOrBase64: string, folder = 'foodrush'): Promise<UploadResult> {
  if (!dataUriOrBase64) throw new AppError(400, 'Image data is required', 'VALIDATION_ERROR');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // 1. If Cloudinary credentials are provided, upload directly to Cloudinary REST API
  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

      const formData = new URLSearchParams();
      formData.append('file', dataUriOrBase64);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('folder', folder);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Cloudinary API upload error:', err);
      } else {
        const json: any = await res.json();
        return {
          url: json.secure_url || json.url,
          publicId: json.public_id,
        };
      }
    } catch (e) {
      console.error('Cloudinary upload network error, falling back to local:', e);
    }
  }

  // 2. Built-in local upload fallback: saves image to local disk
  try {
    const matches = dataUriOrBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(dataUriOrBase64, 'base64');
    }

    const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      url: `/uploads/${filename}`,
      publicId: filename,
    };
  } catch (err: any) {
    // 3. Fallback: return data uri directly if disk write fails
    if (dataUriOrBase64.startsWith('data:')) {
      return { url: dataUriOrBase64 };
    }
    throw new AppError(500, 'Failed to save uploaded image', 'UPLOAD_ERROR');
  }
}
