import { ActionFunction, json } from "@remix-run/node"
import { normalizeHash, remove } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/deletePerm
// Used by LazyLibrarian to remove a torrent AND its data on failure
// Behaves identically to /command/delete since eMulerr always cleans up files
export const action = (async ({ request }) => {
  logger.debug("URL", new URL(request.url).pathname)
  const formData = await request.formData()
  const hashesRaw = (formData.get("hashes") ?? formData.get("hash"))?.toString()?.toUpperCase()

  if (hashesRaw) {
    const hashes = hashesRaw
      .split("|")
      .map((h) => normalizeHash(h))
      .filter(skipFalsy)
    await remove(hashes)
  }

  return json({})
}) satisfies ActionFunction
