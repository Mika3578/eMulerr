import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles, normalizeHash, savePath } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: GET /query/propertiesGeneral/{hash}
// Used by LazyLibrarian getFolder() to determine the save_path for a torrent
export const loader = (async ({ request, params }) => {
  logger.debug("URL", request.url)
  const rawHash = params["*"]?.toUpperCase()
  if (!rawHash) {
    return json({}, { status: 404 })
  }

  const hash = normalizeHash(rawHash)
  const files = await getDownloadClientFiles()
  const file = files.find((f) => f.hash === hash)

  if (!file) {
    return json({}, { status: 404 })
  }

  const category = file.meta?.category
  return json({
    save_path: savePath(category),
    creation_date: file.meta?.addedOn ? Math.floor(file.meta.addedOn / 1000) : 0,
    piece_size: 0,
    comment: "",
    total_wasted: 0,
    total_uploaded: 0,
    total_downloaded: file.size_done ?? 0,
    up_limit: -1,
    dl_limit: -1,
    time_elapsed: 0,
    seeding_time: 0,
    nb_connections: 0,
    nb_connections_limit: 100,
    share_ratio: 0,
  })
}) satisfies LoaderFunction
