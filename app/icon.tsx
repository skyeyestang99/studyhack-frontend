import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/shared/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon. The app had none, which shows as a blank tab in a student's tab bar. */
export default function Icon() {
  return new ImageResponse(<BrandMark size={32} />, size);
}
