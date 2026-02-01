import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Get torrent general properties.
 */
export const loader = (async ({ request, params }) => {
  logger.debug("URL", request.url)
  const hash = params.hash?.toLowerCase()
  if (!hash) {
    return json({}, { status: 404 })
  }

  const files = await getDownloadClientFiles()
  const torrent = files.find((f) => f.hash.toLowerCase() === hash)
  if (!torrent) {
    return json({})
  }

  return json({
    save_path: "/downloads/complete",
    creation_date: torrent.meta?.addedOn
      ? Math.floor(torrent.meta.addedOn / 1000)
      : 0,
    piece_size: 0,
    comment: "",
    total_wasted: 0,
    total_uploaded: 0,
    total_uploaded_session: 0,
    total_downloaded: torrent.size_done,
    total_downloaded_session: torrent.size_done,
    up_limit: -1,
    dl_limit: -1,
    time_elapsed: 0,
    seeding_time: torrent.progress >= 1 ? 1 : 0,
    nb_connections: torrent.src_count_xfer ?? 0,
    nb_connections_limit: 250,
    share_ratio: 0,
    addition_date: torrent.meta?.addedOn
      ? Math.floor(torrent.meta.addedOn / 1000)
      : 0,
    completion_date: torrent.progress >= 1 ? Date.now() / 1000 : 0,
    created_by: "",
    dl_speed_avg: 0,
    dl_speed: torrent.speed ?? 0,
    eta: torrent.eta ?? 8640000,
    last_seen: 0,
    peers: torrent.src_count_xfer ?? 0,
    peers_total: torrent.src_count ?? 0,
    pieces_have: 0,
    pieces_num: 0,
    reannounce: 0,
    seeds: torrent.src_count_xfer ?? 0,
    seeds_total: torrent.src_count ?? 0,
    total_size: torrent.size,
    up_speed_avg: 0,
    up_speed: 0,
  })
}) satisfies LoaderFunction
