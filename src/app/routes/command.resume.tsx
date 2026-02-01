import { ActionFunction } from "@remix-run/node"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Resume torrent.
 * eMulerr/aMule manages resume automatically - no-op for compatibility.
 */
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  return new Response("Ok.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })
}) satisfies ActionFunction
