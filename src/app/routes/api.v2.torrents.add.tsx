import { ActionFunction } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink, fromMagnetLink } from "~/links"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const rawUrls = formData.get("urls")?.toString() ?? ""
  const category = formData.get("category")?.toString() ?? ""

  const urls = rawUrls
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean)

  if (!urls.length) {
    return new Response("Fails.", { status: 200, headers: { "Content-Type": "text/plain" } })
  }

  for (const url of urls) {
    try {
      const { hash, name, size } = url.startsWith("ed2k://") ? fromEd2kLink(url) : fromMagnetLink(url)
      await download(hash, name, size, category)
    } catch {
      return new Response("Fails.", { status: 200, headers: { "Content-Type": "text/plain" } })
    }
  }

  return new Response("Ok.", { status: 200, headers: { "Content-Type": "text/plain" } })
}) satisfies ActionFunction
