import { ActionFunction, json } from "@remix-run/node"
import { normalizeHash, remove } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/delete
// Used by LazyLibrarian to remove a torrent after successful import (keeps data)
// Note: eMulerr always removes files as well; separate keep/delete behaviour is not applicable to ed2k
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashRaw = formData.get("hash")?.toString()?.toUpperCase()

  if (hashRaw) {
    const hash = normalizeHash(hashRaw)
    await remove([hash])
  }

  return json({})
}) satisfies ActionFunction
