import { ActionFunction, json } from "@remix-run/node"
import { normalizeHash, remove } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/deletePerm
// Used by LazyLibrarian to remove a torrent AND its data on failure
// Behaves identically to /command/delete since eMulerr always cleans up files
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashRaw = (formData.get("hashes") ?? formData.get("hash"))?.toString()?.toUpperCase()

  if (hashRaw) {
    const hash = normalizeHash(hashRaw)
    await remove([hash])
  }

  return json({})
}) satisfies ActionFunction
