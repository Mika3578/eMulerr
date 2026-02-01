import { ActionFunction } from "@remix-run/node"
import { remove } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

/**
 * Legacy qBittorrent Web UI API v1 - Delete torrent and data.
 */
export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  if (request.method !== "POST") {
    return new Response("", { status: 405 })
  }

  const formData = await request.formData()
  const hashes = formData.get("hashes")?.toString()
  if (!hashes) {
    return new Response("Ok.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  const hashList = hashes.split("|").filter(Boolean)
  await remove(hashList)

  return new Response("Ok.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })
}) satisfies ActionFunction
