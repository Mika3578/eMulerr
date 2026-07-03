import { useAmule } from '#/amule'
import { parseTorrentHash } from '#/lib/torrents'

export type TorrentFileEntry = {
  index: number
  name: string | undefined
  size: number | undefined
  progress: number
  priority: number
  is_seed: boolean
  availability: number
}

export async function extractTorrentHash(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get('hash')

  if (request.method === 'GET') {
    return fromQuery
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const formData = await request.formData()
    return formData.get('hash')?.toString() ?? fromQuery
  }

  return fromQuery
}

export async function getTorrentFilesResponse(rawHash: string | null | undefined): Promise<Response> {
  if (!rawHash) {
    return Response.json([], { status: 404 })
  }

  const hash = parseTorrentHash(rawHash)
  if (!hash) {
    return Response.json([], { status: 404 })
  }

  const file = await useAmule(async (amule) => {
    const downloads = await amule.getDownloadQueue()
    const shared = await amule.getSharedFiles()

    const download = downloads.find((item) => item.fileHash?.toLowerCase() === hash.toLowerCase())
    if (download) {
      return {
        index: 0,
        name: download.fileName,
        size: download.fileSize,
        progress: download.fileSizeDownloaded ?? 0,
        priority: 1,
        is_seed: true,
        availability: 1,
      } satisfies TorrentFileEntry
    }

    const sharedFile = shared.find((item) => item.fileHash?.toLowerCase() === hash.toLowerCase())
    if (sharedFile) {
      return {
        index: 0,
        name: sharedFile.fileName,
        size: sharedFile.fileSize,
        progress: 1,
        priority: 1,
        is_seed: true,
        availability: 1,
      } satisfies TorrentFileEntry
    }

    return null
  })

  if (!file) {
    return Response.json([], { status: 404 })
  }

  return Response.json([file])
}
