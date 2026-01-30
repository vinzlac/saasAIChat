import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUCKET_NAME = "avatars";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TARGET_SIZE = 200;

export async function uploadProfilePicture(
  userId: string,
  file: ArrayBuffer,
  contentType: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Format non supporté. Utilisez JPG, PNG ou WebP.");
  }

  if (file.byteLength > MAX_SIZE) {
    throw new Error("Fichier trop volumineux. Maximum 5 MB.");
  }

  const supabase = createAdminClient();

  const resized = await sharp(Buffer.from(file))
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  const fileName = `${userId}/avatar.webp`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, resized, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(`Erreur upload: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function deleteProfilePicture(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const fileName = `${userId}/avatar.webp`;

  await supabase.storage.from(BUCKET_NAME).remove([fileName]);
}
