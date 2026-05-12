import { ActionFunction, json } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink } from "~/links"
import { logger } from "~/utils/logger"
import { sanitizeFilename } from "~/utils/naming"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const category = formData.get("category")?.toString()
  if (!category) {
    throw new Error("No download category")
  }

  const urls = formData.getAll("urls").map(String)
  if (!urls.length) {
    throw new Error("No URL to download")
  }

  try {
    const tasks = urls.map(async (url) => {
      const { hash, name, size } = fromEd2kLink(url)
      const sanitizedName = sanitizeFilename(name)
      await download(hash, sanitizedName, size, category)
    })
    await Promise.all(tasks)
    return json({})
  } catch (err) {
    logger.warn("api/v2/ed2k/add failed:", err)
    const isInvalidInput = err instanceof Error && err.message?.includes("Invalid ed2k")
    return json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: isInvalidInput ? 400 : 500 }
    )
  }
}) satisfies ActionFunction
