import { ActionFunction, LoaderFunction } from "@remix-run/node"
import { amuleDoResume } from "amule/amule"
import { normalizeHash } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

function getHashes(request: Request): string[] {
  const url = new URL(request.url)
  const hashesParam = url.searchParams.get("hashes")
  const fromQuery = hashesParam ? hashesParam.toUpperCase().split("|").filter(skipFalsy) : []
  if (fromQuery.length) return fromQuery.map(normalizeHash)
  return []
}

export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  const hashes = getHashes(request)
  if (hashes.length) {
    await Promise.all(hashes.map((h) => amuleDoResume(h).catch(() => void 0)))
  }
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
  const hashes = hashesRaw.length ? hashesRaw.map(normalizeHash) : getHashes(request)
  if (hashes.length) {
    await Promise.all(hashes.map((h) => amuleDoResume(h).catch(() => void 0)))
  }
  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}) satisfies ActionFunction
