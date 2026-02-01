import { LoaderFunction } from "@remix-run/node"

/**
 * qBittorrent Web API v2 - Get application version.
 * Returns version string for qbittorrent-api compatibility.
 */
export const loader = (() =>
  new Response(`v2.8.19`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
