import { ActionFunction } from "@remix-run/node"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/pause
// aMule has no native pause; accept the request and return 200 for compatibility
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}) satisfies ActionFunction
