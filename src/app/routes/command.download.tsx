import { ActionFunction } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink, fromMagnetLink } from "~/links"
import { logger } from "~/utils/logger"

// qBittorrent Web API v1 compatibility: POST /command/download
// Used by LazyLibrarian when snatching from Torznab
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const urlsRaw = formData.get("urls")?.toString()
  const category = formData.get("category")?.toString() ?? formData.get("label")?.toString()

  const headers = { "Content-Type": "text/plain; charset=utf-8" }

  if (!urlsRaw) {
    logger.warn("command/download: missing urls")
    return new Response("Fails.", { status: 200, headers })
  }

  // urls may be newline-separated, take first
  const firstUrl = urlsRaw.split(/[\r\n]+/)[0]?.trim()
  if (!firstUrl) {
    logger.warn("command/download: empty url")
    return new Response("Fails.", { status: 200, headers })
  }

  try {
    const isEd2k = firstUrl.startsWith("ed2k://")
    const { hash, name, size } = isEd2k ? fromEd2kLink(firstUrl) : fromMagnetLink(firstUrl)
    await download(hash, name, size, category ?? "downloads")
    return new Response("Ok.", { status: 200, headers })
  } catch (err) {
    logger.warn("command/download failed:", err)
    return new Response("Fails.", { status: 200, headers })
  }
}) satisfies ActionFunction
