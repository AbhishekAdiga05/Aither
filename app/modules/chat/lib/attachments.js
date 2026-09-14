// Shared file-attachment constants + helpers for the chat UI.
// Safe to import from client components.

export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024; // 4 MB
export const ACCEPTED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

export const ACCEPTED_ATTACHMENT_EXTENSIONS =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf";

export const isImageFile = (file) => file.type.startsWith("image/");

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Validate a list of files against the shared upload limits.
 * Returns an array of per-file error strings; empty array = all good.
 */
export const validateAttachments = (files) => {
  const errors = [];
  if (files.length > MAX_ATTACHMENTS) {
    errors.push(`You can attach up to ${MAX_ATTACHMENTS} files at once.`);
  }
  for (const file of files) {
    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      errors.push(
        `${file.name} is not supported. Use an image or PDF file.`,
      );
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      errors.push(
        `${file.name} is too large (max ${formatFileSize(MAX_ATTACHMENT_SIZE)}).`,
      );
    }
  }
  return errors;
};

/**
 * Convert a File to a FileUIPart ({ type: "file", mediaType, url, filename })
 * by reading it as a base64 data URL. Used when uploading from the home page,
 * where the file must travel through a server action before reaching the chat.
 */
export const fileToFileUIPart = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      resolve({
        type: "file",
        mediaType: file.type,
        url: reader.result,
        filename: file.name,
      });
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

export const filesToFileUIParts = async (files) => {
  const parts = [];
  for (const file of files) {
    parts.push(await fileToFileUIPart(file));
  }
  return parts;
};