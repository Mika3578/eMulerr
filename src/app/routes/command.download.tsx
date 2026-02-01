import { ActionFunction } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink, tryFromEmulerrMagnetLink } from "~/links"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Add torrent from URL/magnet.
 * LazyLibrarian sends multipart form with urls, savepath, label/category.
 * Note: eMulerr only supports eD2k content from its Torznab indexer.
 * Standard BitTorrent magnets from LazyLibrarian's providers will fail.
 */
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  if (request.method !== "POST") {
    return new Response("", { status: 405 })
  }

  const formData = await request.formData()
  const urlsRaw = formData.get("urls")?.toString()
  const category =
    formData.get("category")?.toString() ??
    formData.get("label")?.toString() ??
    "books"

  if (!urlsRaw) {
    return new Response("Fails.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  const urls = urlsRaw.split(/\r?\n/).filter(Boolean)
  let allSucceeded = true

  for (const url of urls) {
    const trimmed = url.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("magnet:")) {
      const parsed = tryFromEmulerrMagnetLink(trimmed)
      if (!parsed) {
        logger.warn(
          "Rejected standard BitTorrent magnet - eMulerr only supports eD2k content from its Torznab indexer"
        )
        allSucceeded = false
        continue
      }
      try {
        await download(parsed.hash, parsed.name, parsed.size, category)
      } catch (err) {
        logger.error("Failed to add magnet", err)
        allSucceeded = false
      }
    } else if (trimmed.startsWith("ed2k://")) {
      try {
        const parsed = fromEd2kLink(trimmed)
        await download(parsed.hash, parsed.name, parsed.size, category)
      } catch (err) {
        logger.error("Failed to add ed2k link", err)
        allSucceeded = false
      }
    } else {
      logger.warn("Rejected non-magnet/ed2k URL - not supported")
      allSucceeded = false
    }
  }

  return new Response(allSucceeded ? "Ok." : "Fails.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })
}) satisfies ActionFunction
