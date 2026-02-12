import { ActionFunction } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink, fromMagnetLink } from "~/links"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const urlsRaw = formData.get("urls")?.toString() ?? formData.get("url")?.toString()
  const category = formData.get("category")?.toString() ?? "downloads"

  if (!urlsRaw) {
    return new Response("Fails.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  const firstUrl = urlsRaw.split(/[\r\n]+/)[0]?.trim()
  if (!firstUrl) {
    return new Response("Fails.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  try {
    const isEd2k = firstUrl.startsWith("ed2k://")
    const { hash, name, size } = isEd2k ? fromEd2kLink(firstUrl) : fromMagnetLink(firstUrl)
    await download(hash, name, size, category)
    return new Response("Ok.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    logger.warn("api/v2/torrents/add failed:", err)
    return new Response("Fails.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}) satisfies ActionFunction
