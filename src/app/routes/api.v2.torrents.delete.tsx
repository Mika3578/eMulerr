import { ActionFunction } from "@remix-run/node"
import { remove } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashesParam = formData.get("hashes")?.toString()?.toUpperCase()
  const rawDeleteFiles = formData.get("deleteFiles")
  const deleteFiles = rawDeleteFiles === null ? true : rawDeleteFiles.toString() === "true"

  const hashes =
    hashesParam === "ALL"
      ? ["ALL"]
      : hashesParam?.split("|").filter(skipFalsy)

  if (hashes?.length) {
    await remove(hashes, deleteFiles)
  }

  return new Response("Ok.", { status: 200, headers: { "Content-Type": "text/plain" } })
}) satisfies ActionFunction
