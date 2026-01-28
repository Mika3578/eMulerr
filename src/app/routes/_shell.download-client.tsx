import { json, LoaderFunction, MetaFunction } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { useState, useEffect } from "react"
import { CategoryPicker } from "~/components/categoryPicker"
import { getCategories } from "~/data/categories"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { DeleteIcon } from "~/icons/deleteIcon"
import { DownIcon } from "~/icons/downIcon"
import { DownloadIcon } from "~/icons/downloadIcon"
import { UpIcon } from "~/icons/upIcon"
import { UserIcon } from "~/icons/userIcon"
import { readableSize, roundToDecimals } from "~/utils/math"
import { readableEta } from "~/utils/time"

export const meta: MetaFunction = () => [{ title: "eMulerr - Downloads" }]

export const loader = (async () => {
  const categories = await getCategories()
  const files = await getDownloadClientFiles()

  return json({
    files,
    categories,
    time: new Date(),
  })
}) satisfies LoaderFunction

export default function Index() {
  const { files, categories } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set())

  // Clear selection when files change (after delete)
  useEffect(() => {
    setSelectedHashes((prev) => {
      const validHashes = new Set(files.map((f) => f.hash))
      const next = new Set([...prev].filter((h) => validHashes.has(h)))
      return next.size !== prev.size ? next : prev
    })
  }, [files])

  const toggleSelection = (hash: string) => {
    setSelectedHashes((prev) => {
      const next = new Set(prev)
      if (next.has(hash)) {
        next.delete(hash)
      } else {
        next.add(hash)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedHashes(new Set(files.map((f) => f.hash)))
  }

  const clearSelection = () => {
    setSelectedHashes(new Set())
  }

  const deleteSelected = () => {
    if (selectedHashes.size === 0) return

    const selectedFiles = files.filter((f) => selectedHashes.has(f.hash))
    const confirmation = confirm(
      `Are you sure you want to delete ${selectedHashes.size} download(s)?\n\n` +
        selectedFiles.map((f) => `• ${f.name}`).join("\n")
    )
    if (!confirmation) return

    const formData = new FormData()
    formData.append("hashes", Array.from(selectedHashes).join("|"))

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/v2/torrents/delete",
    })

    clearSelection()
  }

  return (
    <>
      {/* Header with bulk actions */}
      <div className="sticky top-[60px] z-10 glass-header px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Downloads</h2>
            <span className="rounded-full bg-neutral-700 px-3 py-1 text-sm">
              {files.length} active
            </span>
          </div>

          {/* Quick select button when nothing selected */}
          {files.length > 0 && selectedHashes.size === 0 && (
            <button
              type="button"
              className="text-sm text-neutral-400 hover:text-white"
              onClick={selectAll}
            >
              Select All
            </button>
          )}
        </div>

        {/* Bulk actions bar */}
        {selectedHashes.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-700/50 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selectedHashes.size === files.length}
                onChange={(e) =>
                  e.target.checked ? selectAll() : clearSelection()
                }
              />
              <span className="text-sm font-medium">
                {selectedHashes.size} of {files.length} selected
              </span>
            </label>

            <div className="h-4 w-px bg-neutral-600" />

            <button
              type="button"
              className="text-sm text-neutral-300 hover:text-white"
              onClick={clearSelection}
            >
              Clear Selection
            </button>

            <div className="grow" />

            {/* Bulk category change */}
            <select
              className="rounded border-neutral-600 bg-neutral-700 px-2 py-1 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return
                const formData = new FormData()
                formData.append("hashes", Array.from(selectedHashes).join("|"))
                formData.append("category", e.target.value)
                fetcher.submit(formData, {
                  method: "POST",
                  action: "/api/v2/torrents/setCategory",
                })
                e.target.value = ""
              }}
            >
              <option value="">Set Category...</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-danger px-3 py-1.5 text-sm"
              onClick={deleteSelected}
              disabled={fetcher.state !== "idle"}
            >
              <DeleteIcon />
              Delete ({selectedHashes.size})
            </button>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="p-4">
        {files.length === 0 ? (
          <div className="empty-state">
            <DownloadIcon />
            <p className="empty-state-title">No active downloads</p>
            <p className="empty-state-description">
              Add an eD2k link to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((f) => (
              <DownloadCard
                key={f.hash}
                file={f}
                categories={categories}
                isSelected={selectedHashes.has(f.hash)}
                onToggleSelect={() => toggleSelection(f.hash)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>

function DownloadCard({
  file: f,
  categories,
  isSelected,
  onToggleSelect,
}: {
  file: LoaderData["files"][number]
  categories: string[]
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const fetcher = useFetcher()

  return (
    <div
      className={`card p-4 transition-all ${
        isSelected ? "ring-2 ring-primary-500 bg-primary-500/10" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <label className="flex cursor-pointer items-center pt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
          />
        </label>

        {/* Main content */}
        <div className="grow">
          {/* File name */}
          <div className="mb-3 flex items-start gap-2">
            <button
              type="button"
              className="shrink-0 text-neutral-500 hover:text-neutral-300"
              onClick={() => prompt(undefined, f.link)}
            >
              #
            </button>
            <p className="grow select-text text-sm font-medium leading-snug">
              {f.name}
            </p>
          </div>

          {/* Stats row */}
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <UpIcon />
              <span className="font-medium text-upload">
                {readableSize(f.up_speed)}/s
              </span>
            </div>

            {f.speed != null && (
              <div className="flex items-center gap-1.5">
                <DownIcon />
                <span className="font-medium text-download">
                  {readableSize(f.speed)}/s
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-transfer">
              <DownloadIcon />
              <span>
                {f.size_done !== f.size
                  ? `${readableSize(f.size_done)} / ${readableSize(f.size)}`
                  : readableSize(f.size)}
              </span>
            </div>

            {f.src_count_xfer != null && (
              <div
                className="flex items-center gap-1.5 text-neutral-400"
                title={`Total sources: ${f.src_count}\nConnected Sources: ${f.src_count_xfer}${f.last_seen_complete ? `\nLast seen Complete: ${new Date(f.last_seen_complete * 1000).toLocaleString()}` : ""}`}
              >
                <UserIcon />
                <span>{f.src_count_xfer} sources</span>
              </div>
            )}

            <CategoryPicker
              hash={f.hash}
              allCategories={categories}
              currentCategory={f.meta?.category}
            />
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="progress-container grow lg:min-w-[200px]">
              <div
                className={`progress-bar ${
                  f.status_str === "downloading"
                    ? "bg-gradient-to-r from-lime-600 to-lime-500 downloading"
                    : f.status_str === "completing"
                      ? "bg-gradient-to-r from-purple-600 to-purple-500"
                      : f.status_str === "downloaded"
                        ? "bg-gradient-to-r from-sky-600 to-sky-500"
                        : "bg-gradient-to-r from-amber-700 to-amber-600"
                }`}
                style={{ width: `${f.progress * 100}%` }}
              />
              <div className="progress-label">
                {f.status_str === "downloading" && <>{readableEta(f.eta)} - </>}
                {f.status_str === "stopped" && <>Waiting - </>}
                {f.status_str === "stalled" && <>Stalled - </>}
                {f.status_str === "completing" && <>Verifying - </>}
                {f.status_str === "downloaded" && <>Done - </>}
                {roundToDecimals(f.progress * 100, 2)}%
              </div>
            </div>

            <fetcher.Form
              method="POST"
              action="/api/v2/torrents/delete"
              onSubmit={(ev) => {
                if (!confirm(`Delete "${f.name}"?`)) ev.preventDefault()
              }}
            >
              <input type="hidden" name="hashes" value={f.hash} />
              <button
                type="submit"
                title="Remove"
                disabled={fetcher.state !== "idle"}
                className="btn-danger p-2"
              >
                <DeleteIcon />
              </button>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </div>
  )
}
