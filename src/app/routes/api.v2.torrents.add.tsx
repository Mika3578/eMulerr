import { ActionFunction } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink, fromMagnetLink } from "~/links"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", new URL(request.url).pathname)
  const formData = await request.formData()
  const rawUrls = (formData.get("urls") ?? formData.get("url"))?.toString() ?? ""
  const category = formData.get("category")?.toString() ?? "downloads"

  const urls = rawUrls
    .split(/[\r\n]+/)
    .map((v) => v.trim())
    .filter(Boolean)

  if (!urls.length) {
    return new Response("Fails.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  for (const url of urls) {
    try {
      const { hash, name, size } = url.startsWith("ed2k://") ? fromEd2kLink(url) : fromMagnetLink(url)
      await download(hash, name, size, category)
    } catch (err) {
      logger.warn("api/v2/torrents/add failed:", err)
      return new Response("Fails.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    }
  }

  return new Response("Ok.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}) satisfies ActionFunction
