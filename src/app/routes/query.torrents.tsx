import { LoaderFunction, json } from "@remix-run/node"
import { existsSync } from "fs"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Get torrent list.
 * Returns JSON array in old format for LazyLibrarian compatibility.
 */
function statusToLegacyState(status: string) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "pausedUP"
    case "stalled":
      return "stalledDL"
    case "error":
      return "error"
    case "completing":
      return "checkingUP"
    case "stopped":
      return "pausedDL"
    default:
      return "unknown"
  }
}

function getSavePath(name: string) {
  if (existsSync(`/downloads/complete/${name}`)) {
    return "/downloads/complete"
  }
  return "/downloads"
}

export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const files = await getDownloadClientFiles()

  const torrents = files
    .filter((d) => !category || d.meta?.category === category)
    .map((f) => ({
      hash: f.hash,
      name: f.name,
      size: f.size,
      progress: f.progress,
      dlspeed: f.speed ?? 0,
      upspeed: f.up_speed ?? 0,
      priority: 1,
      num_seeds: f.src_count_xfer ?? 0,
      num_complete: f.src_count ?? -1,
      num_leechs: 0,
      num_incomplete: -1,
      ratio: 0,
      eta: f.eta ?? 8640000,
      state: statusToLegacyState(f.status_str),
      seq_dl: false,
      f_l_piece_prio: false,
      category: f.meta?.category ?? "",
      super_seeding: false,
      force_start: false,
      save_path: getSavePath(f.name),
    }))

  return json(torrents)
}) satisfies LoaderFunction
