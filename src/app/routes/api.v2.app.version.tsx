import { LoaderFunction } from "@remix-run/node"

// qBittorrent API compatibility: returns application version (e.g. v4.1.3)
// Clients like LazyLibrarian call this endpoint first to verify connection
export const loader = (() =>
  new Response(`v4.1.3`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
