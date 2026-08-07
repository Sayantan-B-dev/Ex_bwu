import "server-only";
import { v2 as cloudinary } from "cloudinary";

export interface UploadedAsset {
  publicId: string;
  url: string;
}

function ensureConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary env vars (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export function uploadBuffer(
  buffer: Uint8Array,
  folder: string,
  publicId: string,
  format: string
): Promise<UploadedAsset> {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", folder, public_id: publicId, format, overwrite: true },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload failed."));
        resolve({ publicId: result.public_id, url: result.secure_url });
      }
    );
    stream.end(Buffer.from(buffer));
  });
}

export async function deleteByPublicId(publicId: string): Promise<void> {
  ensureConfig();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch {
    // best-effort cleanup
  }
}