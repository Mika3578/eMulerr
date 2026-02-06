import {
  amuleGetUploads,
  amuleGetDownloads,
  amuleGetShared,
  amuleDoDownload,
  amuleDoDelete,
  amuleDoReloadShared,
} from "amule/amule"
import { AmuleCategory } from "amule/amule.types"
import { toEd2kLink } from "~/links"
import { unlink } from "node:fs/promises"
import { createJsonDb } from "~/utils/jsonDb"
import { staleWhileRevalidate } from "~/utils/memoize"

/** Normalize qBittorrent 40-char hash to internal 32-char ed2k hash */
export function normalizeHash(hash: string): string {
  return hash.length === 40 ? hash.substring(0, 32) : hash
}

export const metadataDb = createJsonDb<
  Record<string, { category: string; addedOn: number }>
>("/config/hash-metadata.json", {})

export const getDownloadClientFiles = staleWhileRevalidate(async function () {
  const uploads = await amuleGetUploads()
  const downloads = [...await amuleGetDownloads()]
  const shared = (await amuleGetShared())
    .filter(
      (f) => !downloads.some((d) => d.hash === f.hash)
    )
    .map(
      (f) =>
        ({
          ...f,
          eta: 0,
          last_seen_complete: 0,
          prio: 0,
          prio_auto: 0,
          progress: 1,
          size_done: f.size,
          size_xfer: 0,
          src_valid: null,
          src_count: null,
          src_count_xfer: null,
          speed: null,
          status: 9,
          status_str: "downloaded",
        }) as const
    )

  const metadata = metadataDb.data

  const files = [
    ...downloads.sort(
      (a, b) =>
        (b.speed > 0 ? 1 : 0) - (a.speed > 0 ? 1 : 0) ||
        b.progress - a.progress ||
        b.speed - a.speed
    ),
    ...shared,
  ].map((f) => ({
    ...f,
    up_speed: uploads
      .filter((u) => u.name === f.name)
      .map((u) => u.xfer_speed)
      .reduce((prev, curr) => prev + curr, 0),
    meta: metadata[f.hash],
  }))

  return files
})

/** Map category string to AmuleCategory; infer from name if generic */
function resolveAmuleCategory(category: string, name: string): AmuleCategory {
  const cat = category?.toLowerCase()
  if (cat === "books") return AmuleCategory.books
  if (cat === "magazines") return AmuleCategory.magazines

  // Infer from extension or keywords when LazyLibrarian sends a single label
  const ext = name.split(".").pop()?.toLowerCase()
  const magazineExts = ["cbz", "cbr", "cbt"]
  if (ext && magazineExts.includes(ext)) return AmuleCategory.magazines

  const magazineKeywords = /magazine|issue|vol\.?\d/i
  if (magazineKeywords.test(name)) return AmuleCategory.magazines

  // Default to books for ebook-like categories, else downloads
  if (cat && ["ebook", "ebooks", "book"].some((k) => cat.includes(k))) {
    return AmuleCategory.books
  }
  return AmuleCategory.downloads
}

export async function download(
  hash: string,
  name: string,
  size: number,
  category: string
) {
  const ed2kLink = toEd2kLink(hash, name, size)
  const amuleCat = resolveAmuleCategory(category, name)
  await amuleDoDownload(ed2kLink, amuleCat)
  setCategory(hash, category)
}

export function setCategory(hash: string, category: string) {
  metadataDb.data[hash] = {
    addedOn: Date.now(),
    category: category,
  }
}

export async function remove(hashes: string[]) {
  if (hashes.length) {
    const downloads = await amuleGetDownloads()
    const shared = await amuleGetShared()

    await Promise.all(
      hashes.map(async (h) => {
        const hash = normalizeHash(h)
        const file =
          downloads.find((v) => v.hash === hash) ??
          shared.find((v) => v.hash === hash)

        await amuleDoDelete(hash)

        if (file) {
          const meta = metadataDb.data[hash]
          const basePath =
            meta?.category?.toLowerCase() === "books"
              ? "/downloads/complete/books"
              : meta?.category?.toLowerCase() === "magazines"
                ? "/downloads/complete/magazines"
                : "/downloads/complete"
          await unlink(`${basePath}/${file.name}`).catch(() => void 0)
          await unlink(`/tmp/shared/${file.name}`).catch(() => void 0)
        }

        delete metadataDb.data[hash]
      })
    )

    await amuleDoReloadShared()
  }
}
