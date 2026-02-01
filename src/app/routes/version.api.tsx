import { LoaderFunction } from "@remix-run/node"

/**
 * Legacy qBittorrent Web UI API v1 - Get API version.
 * Returns "2" for compatibility with LazyLibrarian (supports label/category).
 */
export const loader = (() =>
  new Response("2", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })) satisfies LoaderFunction
