
import { createFileRoute } from '@tanstack/react-router'

// No-op: aMule has no per-torrent share-limit API; Radarr/Sonarr tolerate success here.
export const Route = createFileRoute('/api/v2/torrents/setShareLimits')({
  server: {
    handlers: {
      POST: async () => new Response("Ok", { status: 200 }),
    },
  },
})
