import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/shared/brand-mark";

export const runtime = "edge";

/** PWA icon (192px). Referenced by app/manifest.ts. */
export function GET() {
  return new ImageResponse(<BrandMark size={192} />, { width: 192, height: 192 });
}
