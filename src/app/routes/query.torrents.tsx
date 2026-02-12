import { LoaderFunction, json } from "@remix-run/node"
import { existsSync } from "fs"
import { getDownloadClientFiles, savePath } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: GET /query/torrents
// Used by LazyLibrarian to verify snatch succeeded
export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  const url = new URL(request.url)
  const category = url.searchParams.get("category") ?? url.searchParams.get("label")
  const files = await getDownloadClientFiles()

  const torrents = files
    .filter((d) => !category || d.meta?.category === category)
    .map((f) => ({
      hash: f.hash.length === 32 ? f.hash + "00000000" : f.hash,
      name: f.name,
      size: f.size,
      size_done: f.size_done,
      progress:
        f.progress === 1 ? 1 : Math.min(0.999, Math.max(f.progress, 0.001)),
      dlspeed: f.speed,
      eta: f.eta,
      state: statusToQbittorrentState(f.status_str),
      content_path: contentPath(f.name, f.meta?.category),
      save_path: savePath(f.meta?.category),
      category: f.meta?.category,
    }))

  return json(torrents)
}) satisfies LoaderFunction

function contentPath(name: string, category?: string) {
  const cat = category?.toLowerCase()
  const paths = [
    cat === "books" && `/downloads/complete/books/${name}`,
    cat === "magazines" && `/downloads/complete/magazines/${name}`,
    `/downloads/complete/${name}`,
    `/downloads/complete/books/${name}`,
    `/downloads/complete/magazines/${name}`,
    `/tmp/shared/${name}`,
  ].filter(Boolean) as string[]
  for (const p of paths) {
    if (existsSync(p)) return p
  }
  return undefined
}

function statusToQbittorrentState(
  status: string
): string {
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
      return "moving"
    case "stopped":
      return "pausedDL"
    default:
      return "unknown"
  }
}
