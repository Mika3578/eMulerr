import { ActionFunction, json } from "@remix-run/node"
import { normalizeHash, setCategory } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashesParam = formData.get("hashes")?.toString()
  const hashesRaw = hashesParam ? hashesParam.toUpperCase().split("|").filter(skipFalsy) : []
  const hashes = hashesRaw.map(normalizeHash)
  const category = formData.get("category")?.toString()

  if (category && hashes.length) {
    await Promise.all(hashes.map((hash) => setCategory(hash, category)))
  }

  return json({})
}) satisfies ActionFunction
