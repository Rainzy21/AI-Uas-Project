import { ALLOWED_TYPES } from "@/lib/imageConstants";
import { detectMimeType } from "@/lib/detectMimeType";

export async function sniffImageMime(file: File): Promise<string | null> {
  const header = await file.slice(0, 12).arrayBuffer();
  return detectMimeType(header);
}

/** Returns an Indonesian error message, or null if the file is valid. */
export async function validateImageFileClient(
  file: File,
  maxSize: number,
  maxSizeLabel: string
): Promise<string | null> {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return "File tidak valid. Gunakan PNG, JPG, atau WebP.";
  }
  if (file.size > maxSize) {
    return `File terlalu besar. Maksimal ${maxSizeLabel}.`;
  }
  const sniffed = await sniffImageMime(file);
  if (!sniffed) {
    return "Konten file bukan gambar PNG, JPG, atau WebP yang valid.";
  }
  if (sniffed !== file.type) {
    return "Tipe file tidak cocok dengan isi file. Gunakan file gambar asli.";
  }
  return null;
}
