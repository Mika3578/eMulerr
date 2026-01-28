import { ActionFunction, LoaderFunction } from "@remix-run/node"
import {
  NavLink,
  NavLinkProps,
  json,
  useFetcher,
  useLoaderData,
  useNavigate,
  useOutlet,
} from "@remix-run/react"
import { PropsWithChildren, useState } from "react"
import { restartAmule, amuleGetStats, amuleGetShared } from "amule/amule"
import { useRevalidate } from "~/utils/useRevalidate"
import { readableSize } from "~/utils/math"
import { twMerge } from "tailwind-merge"
import { DownloadIcon } from "~/icons/downloadIcon"
import { SearchIcon } from "~/icons/searchIcon"
import { UpIcon } from "~/icons/upIcon"
import { DownIcon } from "~/icons/downIcon"
import { AddIcon } from "~/icons/addIcon"
import { UploadIcon } from "~/icons/uploadIcon"
import { getCategories } from "~/data/categories"
import { getDownloadClientFiles } from "~/data/downloadClient"

export const action = (async ({ request }) => {
  void restartAmule().catch(() => {})
  return null
}) satisfies ActionFunction

export const loader = (async () => {
  const stats = await amuleGetStats()
  const downloads = await getDownloadClientFiles()
  const shared = await amuleGetShared()
  const ed2kPort = process.env.ED2K_PORT
  const version = process.env.IMG_VER

  // Count shared files that are not in active downloads
  const sharedCount = shared.filter(
    (s) => !downloads.some((d) => d.hash === s.hash)
  ).length

  return json({
    version,
    stats,
    speed_up: stats.speed_up ?? 0,
    speed_down: stats.speed_down ?? 0,
    ed2kPort,
    downloads,
    sharedCount,
    time: new Date(),
    categories: await getCategories(),
  })
}) satisfies LoaderFunction

export default function Layout() {
  const fetcher = useFetcher<typeof loader>()
  const data = useLoaderData<typeof loader>()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const [menuHidden, setMenuHidden] = useState(true)

  useRevalidate(true, 1000)

  return (
    <>
      <header className="glass-header fixed top-0 z-40 flex h-[60px] w-full shrink-0 items-center gap-4 whitespace-nowrap px-4 text-white">
        <NavLink to="/" className="hidden items-center gap-3 sm:flex">
          <img alt="logo" src="/logo.png" className="h-8 drop-shadow-lg" />
          <span className="text-lg font-semibold tracking-tight">eMulerr</span>
        </NavLink>
        <button
          className="block rounded-lg p-2 text-xl hover:bg-neutral-700/50 sm:hidden"
          onClick={() => setMenuHidden((o) => !o)}
        >
          <MenuIcon />
        </button>
        <div className="grow"></div>

        {/* Speed indicators with better styling */}
        <div className="flex items-center gap-4 rounded-lg bg-neutral-700/30 px-3 py-1.5">
          <div
            className="flex items-center gap-1.5 text-sm"
            title="Upload Speed - Small activity indicates P2P handshakes"
          >
            <UpIcon />
            <span className="font-medium text-upload">
              {readableSize(data.speed_up)}/s
            </span>
          </div>
          <div className="h-4 w-px bg-neutral-600" />
          <div
            className="flex items-center gap-1.5 text-sm"
            title="Download Speed - Small activity indicates P2P handshakes"
          >
            <DownIcon />
            <span className="font-medium text-download">
              {readableSize(data.speed_down)}/s
            </span>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2">
          <StatusPill
            state={
              !data.stats.id
                ? "error"
                : data.stats.id < 16777216
                  ? "warn"
                  : data.stats.id != 0xffffffff
                    ? "ok"
                    : "info"
            }
            title={{
              info: "Connecting...",
              ok: `Connected - P2P - ${data.stats.serv_name}`,
              warn:
                "Connected - Low ID\nYour download speed will be impacted\nNeed to open the TCP+UDP port " +
                data.ed2kPort,
              error: "Disconnected",
            }}
          >
            eD2k
          </StatusPill>
          <StatusPill
            state={
              !data.stats.kad_connected
                ? "error"
                : data.stats.kad_firewalled
                  ? "warn"
                  : "ok"
            }
            title={{
              info: "Connecting...",
              ok: "Connected - P2P",
              warn:
                "Connected - Firewalled\nYour download speed will be impacted\nNeed to open the TCP+UDP port " +
                data.ed2kPort,
              error: "Disconnected",
            }}
          >
            KAD
          </StatusPill>
          <fetcher.Form
            action="/"
            method="POST"
            onSubmit={(ev) => {
              const confirmation = confirm(
                `Are you sure you want to reconnect?`
              )
              if (!confirmation) ev.preventDefault()
            }}
          >
            <button
              type="submit"
              className="rounded-lg p-2 text-lg text-neutral-400 hover:bg-neutral-700/50 hover:text-white"
              title="Restart and Reconnect"
            >
              <RestartIcon />
            </button>
          </fetcher.Form>
        </div>
      </header>
      <div
        data-hidden={menuHidden}
        className="fixed left-0 top-0 z-30 hidden h-full w-full backdrop-blur-sm data-[hidden=false]:block sm:data-[hidden=false]:hidden"
        onClick={() => setMenuHidden(true)}
      ></div>
      <nav
        className="fixed top-[60px] z-40 flex h-[calc(100%-60px)] w-[260px] flex-col border-r border-neutral-700/50 bg-neutral-800/95 backdrop-blur-sm max-sm:transition-transform max-sm:duration-300 max-sm:data-[hidden=true]:-translate-x-full"
        data-hidden={menuHidden}
      >
        <div className="flex flex-col py-2">
          <StyledNavLink to="/?index" onClick={() => setMenuHidden(true)}>
            <HomeIcon />
            <span>Home</span>
          </StyledNavLink>
          <StyledNavLink
            to="/download-client"
            onClick={() => setMenuHidden(true)}
          >
            <span className="text-download">
              <DownloadIcon />
            </span>
            <span className="grow">Downloads</span>
            <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs font-medium">
              {data.downloads.length}
            </span>
          </StyledNavLink>
          <StyledNavLink to="/shared" onClick={() => setMenuHidden(true)}>
            <span className="text-upload">
              <UploadIcon />
            </span>
            <span className="grow">Shared</span>
            <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs font-medium">
              {data.sharedCount}
            </span>
          </StyledNavLink>
          <StyledNavLink to="/search" onClick={() => setMenuHidden(true)}>
            <SearchIcon />
            <span>Search</span>
          </StyledNavLink>
        </div>
        <div className="grow"></div>

        {/* Improved add button */}
        <div className="p-4">
          <button
            className="btn-primary w-full py-3"
            onClick={() => {
              const urls = prompt(
                "Enter eD2k links (multiple links separated by semicolon)"
              )
                ?.trim()
                .split(";")
                .map((u) => u.trim())
                .filter((u) => !!u)

              if (!urls?.length) return

              let category: string | null =
                data.categories.length === 1 ? data.categories[0]! : null
              while (!category) {
                category = prompt(
                  `Select a download category:\n${data.categories.map((c) => "  - " + c).join("\n")}`
                )
                if (!category) return
              }

              const formData = new FormData()
              formData.append("category", category)
              urls.forEach((url) => formData.append("urls", url))

              fetcher.submit(formData, {
                method: "POST",
                action: "/api/v2/ed2k/add",
              })

              alert("Download started!")
              navigate("/download-client")
            }}
          >
            <span className="text-xl">
              <AddIcon />
            </span>
            <span>Add eD2k Link</span>
          </button>
        </div>
        <span className="mb-4 select-text text-center text-xs text-neutral-500">
          {data.version}
        </span>
      </nav>
      <main className="relative mt-[60px] sm:ml-[260px]">{outlet}</main>
    </>
  )
}

function StyledNavLink({ ...props }: Omit<NavLinkProps, "className">) {
  return (
    <NavLink
      className={({ isActive }) =>
        twMerge("nav-link", isActive && "nav-link-active")
      }
      {...props}
    />
  )
}

function StatusPill({
  state,
  title,
  children,
  ...props
}: PropsWithChildren<{
  state: "info" | "ok" | "warn" | "error"
  title: Record<typeof state, string>
}>) {
  const styles: Record<typeof state, string> = {
    info: "border-slate-500/50 bg-slate-500/20 text-slate-300",
    ok: "border-green-500/50 bg-green-500/20 text-green-300",
    warn: "border-yellow-500/50 bg-yellow-500/20 text-yellow-300",
    error: "border-red-500/50 bg-red-500/20 text-red-300",
  }

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition-colors ${styles[state]}`}
      title={title[state]}
      {...props}
    >
      <span className={`status-dot ${state}`} />
      {children}
    </span>
  )
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 576 512"
      style={{ display: "inline-block", height: "1em", verticalAlign: "text-top" }}
    >
      <path
        fill="currentColor"
        d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"
      />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      style={{ height: "1em" }}
    >
      <path
        fill="currentColor"
        d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V256c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM143.5 120.6c13.6-11.3 15.4-31.5 4.1-45.1s-31.5-15.4-45.1-4.1C49.7 115.4 16 181.8 16 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-74.2-33.8-140.6-86.6-184.6c-13.6-11.3-33.8-9.4-45.1 4.1s-9.4 33.8 4.1 45.1c38.9 32.3 63.5 81 63.5 135.4c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-54.4 24.7-103.1 63.5-135.4z"
      ></path>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      style={{ height: "1em" }}
    >
      <path
        fill="currentColor"
        d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"
      ></path>
    </svg>
  )
}
