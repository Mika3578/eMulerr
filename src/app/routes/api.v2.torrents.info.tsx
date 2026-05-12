import { LoaderFunction, json } from "@remix-run/node"
import { amuleGetDownloads } from "amule/amule"
import { existsSync } from "fs"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const files = await getDownloadClientFiles()

  return json(
    files
      .filter((d) => !category || d.meta?.category === category)
      .map((f) => {
        const isComplete = f.progress >= 1
        const completedAt = isComplete ? Math.floor(Date.now() / 1000) : 0
        const addedAt = f.meta?.addedOn ? Math.floor(f.meta.addedOn / 1000) : Math.floor(Date.now() / 1000)
        const contentPathValue = contentPath(f.name, isComplete)
        return {
          hash: f.hash,
          name: f.name,
          size: f.size,
          progress: isComplete ? 1 : Math.min(0.999, Math.max(f.progress, 0.001)),
          state: statusToQbittorrentState(f.status_str),
          category: f.meta?.category ?? "",
          save_path: "/downloads/complete",
          content_path: contentPathValue,
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

function contentPath(name: string, isComplete: boolean) {
  if (!isComplete) return `/downloads/incomplete/${name}`
  if (existsSync(`/downloads/complete/${name}`)) return `/downloads/complete/${name}`
  if (existsSync(`/tmp/shared/${name}`)) return `/tmp/shared/${name}`
  return `/downloads/complete/${name}`
}

function statusToQbittorrentState(status: Awaited<ReturnType<typeof amuleGetDownloads>>[0]["status_str"]) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "uploading"
    case "stopped":
      return "pausedDL"
    case "error":
      return "error"
    default:
      return "stalledDL"
  }
}
