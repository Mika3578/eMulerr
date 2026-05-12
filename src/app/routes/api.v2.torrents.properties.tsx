import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles } from "~/data/downloadClient"

export const loader = (async ({ request }) => {
  const hash = new URL(request.url).searchParams.get("hash")?.toUpperCase()
  const file = (await getDownloadClientFiles()).find((f) => f.hash === hash)
  const now = Math.floor(Date.now() / 1000)
  const added = file?.meta?.addedOn ? Math.floor(file.meta.addedOn / 1000) : now
  const complete =
    file?.progress === 1
      ? file.last_seen_complete || (file.meta?.addedOn ? Math.floor(file.meta.addedOn / 1000) : 0)
      : 0

  return json({
    save_path: "/downloads/complete",
    creation_date: 0,
    piece_size: 0,
    comment: "",
    total_wasted: 0,
    total_uploaded: 0,
    total_uploaded_session: 0,
    total_downloaded: file?.size_done ?? 0,
    total_downloaded_session: 0,
    up_limit: 0,
    dl_limit: 0,
    time_elapsed: Math.max(0, now - added),
    seeding_time: complete ? Math.max(0, now - complete) : 0,
    nb_connections: 0,
    nb_connections_limit: 0,
    share_ratio: 0,
    addition_date: added,
    completion_date: complete,
    created_by: "eMulerr",
    dl_speed_avg: file?.speed ?? 0,
    dl_speed: file?.speed ?? 0,
    eta: file?.eta ?? 0,
    last_seen: complete,
    peers: 0,
    seeds: 0,
    total_size: file?.size ?? 0,
  })
}) satisfies LoaderFunction
