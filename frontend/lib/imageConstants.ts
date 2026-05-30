export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_TYPES)[number];
export const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
