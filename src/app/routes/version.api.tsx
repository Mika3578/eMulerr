import { LoaderFunction } from "@remix-run/node"

// qBittorrent Web API v1 compatibility: GET /version/api
// Returns Web API version as plain text (e.g. 2.8.19)
// Used by LazyLibrarian when connecting to download client
export const loader = (() =>
  new Response(`2.8.19`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
