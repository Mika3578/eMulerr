import { json, LoaderFunction, MetaFunction } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

export const meta: MetaFunction = () => [{ title: "eMulerr - Home" }]

export const loader = (async () => {
  return json({
    port: process.env.PORT,
    password: process.env.PASSWORD,
    ed2kPort: process.env.ED2K_PORT,
  })
}) satisfies LoaderFunction

export default function Index() {
  const data = useLoaderData<typeof loader>()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-gradient mb-2">Welcome to eMulerr!</h1>
        <p className="text-neutral-400">
          Follow the steps below to configure your *arr applications
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Download Client */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
              1
            </span>
            <h2>Configure Download Client</h2>
          </div>

          <p className="mb-4 text-sm text-neutral-400">
            Add eMulerr as a download client in Radarr/Sonarr:
          </p>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-neutral-900/50 p-4 text-sm">
            <ConfigRow label="Type" value="qBittorrent" />
            <ConfigRow label="Name" value="emulerr" />
            <ConfigRow label="Host" value="THIS_CONTAINER_NAME" selectable />
            <ConfigRow label="Port" value={data.port ?? ""} selectable />
            {data.password !== "" && (
              <>
                <ConfigRow label="Username" value="emulerr" />
                <ConfigRow label="Password" value={data.password ?? ""} selectable />
              </>
            )}
            <ConfigRow label="Priority" value="50" />
            <ConfigRow label="Remove completed" value="Yes" />
          </div>
        </div>

        {/* Step 2: Indexer */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
              2
            </span>
            <h2>Configure Indexer</h2>
          </div>

          <p className="mb-4 text-sm text-neutral-400">
            Add eMulerr as a Torznab indexer in Radarr/Sonarr:
          </p>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-neutral-900/50 p-4 text-sm">
            <ConfigRow label="Type" value="Torznab" />
            <ConfigRow label="Name" value="emulerr" />
            <ConfigRow label="RSS" value="No" />
            <ConfigRow
              label="Automatic Search"
              value="Up to you"
              hint="(may download unexpected content)"
            />
            <ConfigRow label="Interactive Search" value="Yes" />
            <ConfigRow
              label="URL"
              value={`http://THIS_CONTAINER_NAME:${data.port}/`}
              selectable
            />
            {data.password !== "" && (
              <ConfigRow label="API Key" value={data.password ?? ""} selectable />
            )}
            <ConfigRow label="Download Client" value="emulerr" />
          </div>
        </div>

        {/* Step 3: Ports */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
              3
            </span>
            <h2>Open Router Ports</h2>
          </div>

          <p className="mb-4 text-sm text-neutral-400">
            Forward these ports on your router for optimal P2P connectivity:
          </p>

          <div className="flex gap-4">
            <div className="rounded-lg bg-neutral-900/50 px-6 py-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                TCP
              </div>
              <div className="select-text font-mono text-2xl font-bold text-white">
                {data.ed2kPort}
              </div>
            </div>
            <div className="rounded-lg bg-neutral-900/50 px-6 py-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                UDP
              </div>
              <div className="select-text font-mono text-2xl font-bold text-white">
                {data.ed2kPort}
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card border-primary-500/30 bg-primary-500/5 p-6">
          <h3 className="mb-3 font-semibold text-primary-400">Tips</h3>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>
                Make sure both eD2k and KAD status indicators in the header are
                green for best performance.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>
                Downloads may take time to find sources. ED2K network is slower
                than torrents but has unique content.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>
                Keep the app running to seed files and help the network.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}

function ConfigRow({
  label,
  value,
  hint,
  selectable,
}: {
  label: string
  value: string | number
  hint?: string
  selectable?: boolean
}) {
  return (
    <>
      <span className="text-neutral-400">{label}:</span>
      <span className={selectable ? "select-text font-mono text-white" : ""}>
        {value}
        {hint && (
          <span className="ml-1 text-xs text-neutral-500">{hint}</span>
        )}
      </span>
    </>
  )
}
