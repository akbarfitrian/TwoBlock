import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const IMAGE_TYPE_LABEL = "PNG, JPEG, WEBP, or GIF";

const MAX_VIDEO_BYTES = 2 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const VIDEO_TYPE_LABEL = "MP4, WEBM, or MOV";

export class UploadError extends Error {}

function assertValidFile(file: File, allowedTypes: string[], maxBytes: number, typeLabel: string) {
  if (!allowedTypes.includes(file.type)) {
    throw new UploadError(`File must be ${typeLabel}.`);
  }
  if (file.size > maxBytes) {
    throw new UploadError(`File must be at most ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }
}

async function uploadToBucket(
  bucket: "avatars" | "post-images" | "post-videos",
  wallet: string,
  file: File,
  validate: () => void
): Promise<string> {
  validate();
  const supabase = createSupabaseBrowserClient();

  const ext = file.name.split(".").pop() || "png";
  const path = `${wallet}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    throw new UploadError(`Gagal upload file: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadAvatar(wallet: string, file: File): Promise<string> {
  return uploadToBucket("avatars", wallet, file, () => assertValidFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, IMAGE_TYPE_LABEL));
}

export function uploadPostImage(wallet: string, file: File): Promise<string> {
  return uploadToBucket("post-images", wallet, file, () => assertValidFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, IMAGE_TYPE_LABEL));
}

// Short video attachments for posts — separate bucket + much higher size
// cap than images (see 0014_post_video.sql for the matching bucket limit).
export function uploadPostVideo(wallet: string, file: File): Promise<string> {
  return uploadToBucket("post-videos", wallet, file, () => assertValidFile(file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES, VIDEO_TYPE_LABEL));
}
