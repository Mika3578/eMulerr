import { LoaderFunction, json } from "@remix-run/node"
import { existsSync } from "fs"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Get torrent file list.
 */
export const loader = (async ({ request, params }) => {
  logger.debug("URL", request.url)
  const hash = params.hash?.toLowerCase()
  if (!hash) {
    return json([], { status: 404 })
  }

  const files = await getDownloadClientFiles()
  const torrent = files.find((f) => f.hash.toLowerCase() === hash)
  if (!torrent) {
    return json([])
  }

  const path = existsSync(`/downloads/complete/${torrent.name}`)
    ? `/downloads/complete/${torrent.name}`
    : torrent.name

  return json([
    {
      name: path,
      size: torrent.size,
      progress: torrent.progress,
      priority: 1,
      is_seed: torrent.progress >= 1,
      piece_range: [0, 0],
    },
  ])
}) satisfies LoaderFunction
