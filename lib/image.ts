/**
 * Downscale + JPEG-compress an image to a data URL so it fits the chat body limit.
 *
 * Extracted from CourseChatPanel so Quick Help can accept photos too. Homework
 * mostly arrives as a phone photo of a problem set, so an ask-a-question surface
 * without camera input is missing the most common input method — especially on the
 * mobile web, which is where a zero-setup entry point gets used.
 */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.7,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
