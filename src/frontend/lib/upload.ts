import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export class UploadError extends Error {}

function assertValidImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadError("Image must be PNG, JPEG, WEBP, or GIF.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadError("Image must be at most 2MB.");
  }
}

async function uploadToBucket(bucket: "avatars" | "post-images", wallet: string, file: File): Promise<string> {
  assertValidImage(file);
  const supabase = createSupabaseBrowserClient();

  const ext = file.name.split(".").pop() || "png";
  const path = `${wallet}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    throw new UploadError(`Gagal upload gambar: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadAvatar(wallet: string, file: File): Promise<string> {
  return uploadToBucket("avatars", wallet, file);
}

export function uploadPostImage(wallet: string, file: File): Promise<string> {
  return uploadToBucket("post-images", wallet, file);
}
