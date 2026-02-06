import { ActionFunction, LoaderFunction } from "@remix-run/node"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

// qBittorrent API compatibility: aMule has no native pause, return 200 for LazyLibrarian "Test Downloader"
function getHashes(request: Request): string[] {
  const url = new URL(request.url)
  const hashesParam = url.searchParams.get("hashes")
  const fromQuery = hashesParam ? hashesParam.toUpperCase().split("|").filter(skipFalsy) : []
  if (fromQuery.length) return fromQuery
  return []
}

export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  getHashes(request) // accept but no-op
  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}) satisfies LoaderFunction

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashesParam = formData.get("hashes")?.toString()
  const hashesRaw = hashesParam ? hashesParam.toUpperCase().split("|").filter(skipFalsy) : []
  const hashes = hashesRaw.length ? hashesRaw : getHashes(request)
  if (hashes.length) {
    // aMule has no pause; accept for compatibility
  }
  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}) satisfies ActionFunction
