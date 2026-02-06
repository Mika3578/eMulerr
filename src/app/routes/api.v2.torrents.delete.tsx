import { ActionFunction, json } from "@remix-run/node"
import { normalizeHash, remove } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashesParam = formData.get("hashes")?.toString()
  const hashesRaw = hashesParam ? hashesParam.toUpperCase().split("|").filter(skipFalsy) : []
  const hashes = hashesRaw.map(normalizeHash)

  if (hashes.length) {
    await remove(hashes)
  }

  return json({})
}) satisfies ActionFunction
