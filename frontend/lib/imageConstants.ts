export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_TYPES)[number];

/** Keep below serverless body limits (e.g. Vercel ~4.5 MB) */
export const MAX_SIZE = 4 * 1024 * 1024;
export const MAX_SIZE_LABEL = "4 MB";
