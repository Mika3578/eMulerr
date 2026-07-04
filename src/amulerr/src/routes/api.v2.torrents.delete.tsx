
import { useAmule } from '#/amule'
import { skipFalsy } from '#/lib/array'
import { hasTorrentHashInput, resolveTorrentHashes, ed2kHashSet, normalizeEd2kHash } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const rawHashes = formData.get("hashes")?.toString()

        if (hasTorrentHashInput(rawHashes)) {
          await useAmule(async (amule) => {
            const allHashes = rawHashes?.trim().toLowerCase() === "all"
            const hashes = await resolveTorrentHashes(amule, rawHashes)
            if (!hashes.length && !allHashes) {
              return
            }

            const shared = await amule.getSharedFiles()
            const hashSet = ed2kHashSet(hashes)
            const ecids = shared
              .filter(f => {
                if (allHashes) {
                  return true
                }
                const normalized = normalizeEd2kHash(f.fileHash)
                return normalized !== null && hashSet.has(normalized)
              })
              .map(f => f.ecid).filter(skipFalsy)

            await amule.clearCompleted(ecids)
            for (const hash of hashes) {
              await amule.cancelDownload(hash)
            }
          })
        }

        return Response.json({})
      }
    }
  },
})
