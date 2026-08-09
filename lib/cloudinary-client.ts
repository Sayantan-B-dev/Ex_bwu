interface SignResponse {
  ok: boolean;
  error?: string;
  timestamp?: number;
  signature?: string;
  apiKey?: string;
  cloudName?: string;
  folder?: string;
  publicId?: string;
  format?: string;
}

interface UploadResult {
  ok: boolean;
  publicId?: string;
  url?: string;
  error?: string;
}

export async function signAndUpload(params: {
  folder: string;
  publicId: string;
  format: string;
  file: File;
}): Promise<UploadResult> {
  const { folder, publicId, format, file } = params;

  const signResp = await fetch("/api/admin/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, publicId, format }),
  });
  const signData: SignResponse = await signResp.json();
  if (!signData.ok || !signData.timestamp || !signData.signature || !signData.apiKey || !signData.cloudName) {
    return { ok: false, error: signData.error ?? "Failed to get upload signature." };
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", signData.apiKey);
  fd.append("timestamp", String(signData.timestamp));
  fd.append("signature", signData.signature);
  fd.append("folder", folder);
  fd.append("public_id", publicId);
  fd.append("overwrite", "1");
  fd.append("resource_type", "raw");

  const uploadResp = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/raw/upload`,
    { method: "POST", body: fd }
  );
  const uploadData = await uploadResp.json();

  if (!uploadResp.ok || !uploadData.public_id) {
    return { ok: false, error: uploadData.error?.message ?? "Cloudinary upload failed." };
  }

  return { ok: true, publicId: uploadData.public_id, url: uploadData.secure_url };
}
