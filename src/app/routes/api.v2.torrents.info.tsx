import { LoaderFunction, json } from "@remix-run/node"
import { amuleGetDownloads } from "amule/amule"
import { getDownloadClientFiles, savePath, safeName } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  logger.debug("URL", new URL(request.url).pathname)
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const files = await getDownloadClientFiles()

  return json(
    files
      .filter((d) => !category || d.meta?.category === category)
      .map((f) => {
        const isComplete = f.progress >= 1
        const completedAt = isComplete
          ? f.last_seen_complete || (f.meta?.addedOn ? Math.floor(f.meta.addedOn / 1000) : 0)
          : 0
        const addedAt = f.meta?.addedOn ? Math.floor(f.meta.addedOn / 1000) : Math.floor(Date.now() / 1000)
        return {
          // Pad 32-char ed2k hash to 40 chars for LazyLibrarian compatibility
          hash: f.hash.length === 32 ? f.hash + "00000000" : f.hash,
          name: f.name,
          size: f.size,
          size_done: f.size_done,
          progress: isComplete ? 1 : Math.min(0.999, Math.max(f.progress, 0.001)),
          state: statusToQbittorrentState(f.status_str),
          category: f.meta?.category ?? "",
          save_path: savePath(f.meta?.category),
          content_path: contentPath(f.name, f.meta?.category),
          completion_on: completedAt,
          added_on: addedAt,
          amount_left: isComplete ? 0 : Math.max(0, f.size - f.size_done),
          dlspeed: f.speed ?? 0,
          upspeed: f.up_speed ?? 0,
          eta: f.eta ?? 0,
          ratio: 0,
          completed: isComplete ? f.size : f.size_done,
          seen_complete: completedAt,
        }
      })
  )
}) satisfies LoaderFunction

export const action = loader

function contentPath(name: string, category?: string) {
  return `${savePath(category)}/${safeName(name)}`
}

function statusToQbittorrentState(status: Awaited<ReturnType<typeof amuleGetDownloads>>[0]["status_str"]) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "pausedUP"
    case "stopped":
      return "pausedDL"
    case "error":
      return "error"
    case "completing":
      return "moving"
    case "stalled":
      return "stalledDL"
    default:
      return "stalledDL"
  }
}
