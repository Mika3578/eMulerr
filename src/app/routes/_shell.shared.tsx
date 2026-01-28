import { json, LoaderFunction, MetaFunction } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { useState, useEffect } from "react"
import { DeleteIcon } from "~/icons/deleteIcon"
import { UpIcon } from "~/icons/upIcon"
import { UploadIcon } from "~/icons/uploadIcon"
import { readableSize } from "~/utils/math"
import { getSharedFiles } from "~/data/downloadClient"

export const meta: MetaFunction = () => [{ title: "eMulerr - Shared Files" }]

export const loader = (async () => {
  const files = await getSharedFiles()

  return json({
    files,
    // Calculate totals
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    totalUploaded: files.reduce((sum, f) => sum + f.total_uploaded, 0),
    time: new Date(),
  })
}) satisfies LoaderFunction

export default function SharedFiles() {
  const { files, totalSize, totalUploaded } = useLoaderData<typeof loader>()
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
      `Are you sure you want to delete ${selectedHashes.size} file(s)?\n\n` +
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
      {/* Header with stats and bulk actions */}
      <div className="sticky top-[60px] z-10 glass-header px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Shared Files</h2>
            <span className="rounded-full bg-neutral-700 px-3 py-1 text-sm">
              {files.length} files
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <span>Total: {readableSize(totalSize)}</span>
            <span className="text-upload">
              <UploadIcon /> {readableSize(totalUploaded)} uploaded
            </span>
          </div>
        </div>

        {/* Quick select button when nothing selected */}
        {files.length > 0 && selectedHashes.size === 0 && (
          <div className="mt-2">
            <button
              type="button"
              className="text-sm text-neutral-400 hover:text-white"
              onClick={selectAll}
            >
              Select All
            </button>
          </div>
        )}

        {/* Bulk actions bar - shows when items selected */}
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

      {/* Content */}
      <div className="p-4">
        {files.length === 0 ? (
          <div className="empty-state">
            <UploadIcon />
            <p className="empty-state-title">No shared files</p>
            <p className="empty-state-description">
              Completed downloads will appear here for seeding
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((f) => (
              <SharedFileCard
                key={f.hash}
                file={f}
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

function SharedFileCard({
  file: f,
  isSelected,
  onToggleSelect,
}: {
  file: LoaderData["files"][number]
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

        {/* File info */}
        <div className="grow">
          <div className="flex items-start gap-2">
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
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            <span>Size: {readableSize(f.size)}</span>

            {f.up_speed > 0 && (
              <span className="font-medium text-upload">
                <UpIcon /> {readableSize(f.up_speed)}/s
              </span>
            )}

            <span className="text-upload">
              <UploadIcon /> {readableSize(f.total_uploaded)} uploaded
            </span>

            <span title="Total requests / Accepted">
              Requests: {f.requests_all} / Accepted: {f.accepts_all}
            </span>

            {f.meta?.category && (
              <span className="rounded bg-neutral-700 px-2 py-0.5">
                {f.meta.category}
              </span>
            )}
          </div>
        </div>

        {/* Individual delete button */}
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
            className="p-2 text-neutral-500 hover:text-red-400"
          >
            <DeleteIcon />
          </button>
        </fetcher.Form>
      </div>
    </div>
  )
}
