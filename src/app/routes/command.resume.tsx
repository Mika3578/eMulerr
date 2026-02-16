import { ActionFunction } from "@remix-run/node"
import { amuleDoResume } from "amule/amule"
import { normalizeHash } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/resume
// Used by LazyLibrarian to resume a paused torrent
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashRaw = formData.get("hash")?.toString()?.toUpperCase()

  if (hashRaw) {
    const hash = normalizeHash(hashRaw)
    await amuleDoResume(hash).catch(() => void 0)
  }

  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}) satisfies ActionFunction
