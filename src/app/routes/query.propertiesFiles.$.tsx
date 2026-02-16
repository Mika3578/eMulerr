import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles, normalizeHash, safeName } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: GET /query/propertiesFiles/{hash}
// Used by LazyLibrarian getFiles() to list files in a torrent
export const loader = (async ({ request, params }) => {
  logger.debug("URL", request.url)
  const rawHash = params["*"]?.toUpperCase()
  if (!rawHash) {
    return json([], { status: 404 })
  }

  const hash = normalizeHash(rawHash)
  const files = await getDownloadClientFiles()
  const torrent = files.find((f) => f.hash === hash)

  if (!torrent) {
    return json([], { status: 404 })
  }

  return json([
    {
      name: safeName(torrent.name),
      size: torrent.size,
      progress: torrent.progress,
      priority: 1,
      is_seed: torrent.progress === 1,
    },
  ])
}) satisfies LoaderFunction
