import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/shared/brand-mark";

export const runtime = "edge";

/** PWA icon (512px). Referenced by app/manifest.ts. */
export function GET() {
  return new ImageResponse(<BrandMark size={512} />, { width: 512, height: 512 });
}
