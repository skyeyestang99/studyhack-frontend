import { env } from "@/lib/env";

export function resolveMaterialUrl(url: string) {
  if (url.startsWith("/api/")) return `${env.apiUrl}${url}`;
  return url;
}
