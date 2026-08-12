import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/shared/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for "Add to Home Screen" on iOS. */
export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={180} />, size);
}
