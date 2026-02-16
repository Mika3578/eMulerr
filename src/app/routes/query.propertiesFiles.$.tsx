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
  const file = files.find((f) => f.hash === hash)

  if (!file) {
    return json([], { status: 404 })
  }

  return json([
    {
      name: safeName(file.name),
      size: file.size,
      progress: file.progress,
      priority: 1,
      is_seed: file.progress === 1,
    },
  ])
}) satisfies LoaderFunction
