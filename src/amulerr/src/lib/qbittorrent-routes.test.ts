import { describe, expect, it, vi } from "vitest"
import {
  clampProgress,
  defaultQbittorrentPreferences,
  QBITTORRENT_WEBAPI_VERSION,
  qbittorrentTorrentExtras,
  torrentAmountLeft,
} from "./qbittorrent"

vi.mock("#/amule", () => ({
  useAmule: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      getDownloadQueue: async () => [],
      getSharedFiles: async () => [],
    })
  ),
}))

type RouteHandler = (ctx: { request: Request }) => Promise<Response>

function getHandler(route: { options?: { server?: { handlers?: { GET?: RouteHandler; POST?: RouteHandler } } } }, method: "GET" | "POST" = "GET") {
  const handler = route.options?.server?.handlers?.[method]
  if (!handler) {
    throw new Error(`Missing ${method} handler`)
  }
  return handler
}

describe("qbittorrent lib", () => {
  it("returns safe preference defaults", () => {
    const prefs = defaultQbittorrentPreferences()
    expect(prefs.max_ratio_enabled).toBe(false)
    expect(prefs.max_ratio).toBe(-1)
    expect(prefs.max_seeding_time_enabled).toBe(false)
    expect(prefs.max_seeding_time).toBe(-1)
  })

  it("adds stable torrent list extras", () => {
    expect(qbittorrentTorrentExtras({})).toEqual({
      ratio: 0,
      max_ratio: -1,
      seeding_time: 0,
      completion_on: -1,
      uploaded: 0,
      upspeed: 0,
    })
  })

  it("clampProgress maps aMule percent to qBittorrent 0..1 fraction", () => {
    expect(clampProgress(undefined)).toBe(0)
    expect(clampProgress("50")).toBe(0.5)
    expect(clampProgress(50)).toBe(0.5)
    expect(clampProgress("100")).toBe(1)
    expect(clampProgress(100)).toBe(1)
    expect(clampProgress("150")).toBe(1)
    expect(clampProgress(-5)).toBe(0)
  })

  it("torrentAmountLeft never returns negative values", () => {
    expect(torrentAmountLeft(100, 50)).toBe(50)
    expect(torrentAmountLeft(100, 150)).toBe(0)
  })
})

describe("app routes", () => {
  it("/api/v2/app/webapiVersion returns text/plain semver", async () => {
    const { Route } = await import("#/routes/api.v2.app.webapiVersion")
    const response = await getHandler(Route)({ request: new Request("http://x/api/v2/app/webapiVersion") })
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/plain")
    expect(await response.text()).toBe(QBITTORRENT_WEBAPI_VERSION)
  })

  it("/api/v2/app/version returns qBittorrent-like version text", async () => {
    const { Route } = await import("#/routes/api.v2.app.version")
    const response = await getHandler(Route)({ request: new Request("http://x/api/v2/app/version") })
    expect(response.headers.get("Content-Type")).toBe("text/plain")
    expect(await response.text()).toMatch(/^v/)
  })

  it("/api/v2/app/preferences returns required JSON fields", async () => {
    const { Route } = await import("#/routes/api.v2.app.preferences")
    const response = await getHandler(Route)({ request: new Request("http://x/api/v2/app/preferences") })
    const body = await response.json()
    expect(body.max_ratio_enabled).toBe(false)
    expect(body.max_seeding_time).toBe(-1)
  })

  it("/api/v2/auth/login returns Ok. and SID cookie", async () => {
    const { Route } = await import("#/routes/api.v2.auth.login")
    const response = await getHandler(Route, "POST")({ request: new Request("http://x") })
    expect(await response.text()).toBe("Ok.")
    expect(response.headers.get("Set-Cookie")).toContain("SID=")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("/api/v2/auth/login adds Secure to SID cookie over HTTPS", async () => {
    const { Route } = await import("#/routes/api.v2.auth.login")
    const response = await getHandler(Route, "POST")({
      request: new Request("https://x/api/v2/auth/login"),
    })
    expect(response.headers.get("Set-Cookie")).toContain("; Secure")
  })

  it("/api/v2/auth/logout adds Secure when behind HTTPS proxy", async () => {
    const { Route } = await import("#/routes/api.v2.auth.logout")
    const response = await getHandler(Route, "POST")({
      request: new Request("http://x/api/v2/auth/logout", {
        headers: { "X-Forwarded-Proto": "https" },
      }),
    })
    expect(response.headers.get("Set-Cookie")).toContain("; Secure")
  })
})

describe("torrents/properties", () => {
  it("returns 404 for invalid hash without calling aMule", async () => {
    const { useAmule } = await import("#/amule")
    const { Route } = await import("#/routes/api.v2.torrents.properties")
    const request = new Request("http://x/api/v2/torrents/properties?hash=notvalid")
    const response = await getHandler(Route)({ request })
    expect(response.status).toBe(404)
    expect(useAmule).not.toHaveBeenCalled()
  })

  it("returns 404 for missing torrent", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.properties")
    const hash = `${"a".repeat(32)}00000000`
    const request = new Request(`http://x/api/v2/torrents/properties?hash=${hash}`)
    const response = await getHandler(Route)({ request })
    expect(response.status).toBe(404)
  })
})

describe("no-op torrent routes", () => {
  const postRequest = { request: new Request("http://x", { method: "POST" }) }

  it("setShareLimits returns Ok", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.setShareLimits")
    const response = await getHandler(Route, "POST")(postRequest)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("Ok")
  })

  it("topPrio returns Ok", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.topPrio")
    const response = await getHandler(Route, "POST")(postRequest)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("Ok")
  })

  it("setForceStart returns Ok", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.setForceStart")
    const response = await getHandler(Route, "POST")(postRequest)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("Ok")
  })
})

const ED2K = "A1B2C3D4E5F60718293A4B5C6D7E8F90"
const BTIH = `${ED2K.toLowerCase()}00000000`

describe("torrents/info", () => {
  async function getInfoTorrent(progress: string, fileSize = 100, fileSizeDownloaded = 50, speed = 10) {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: "book.pdf",
            fileSize,
            fileSizeDownloaded,
            progress,
            speed,
            status: 3,
          },
        ],
        getSharedFiles: async () => [],
        getCategories: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.info")
    const response = await getHandler(Route)({
      request: new Request("http://x/api/v2/torrents/info"),
    })
    expect(response.status).toBe(200)
    return (await response.json())[0]
  }

  it("returns progress 1 when aMule reports 100", async () => {
    const torrent = await getInfoTorrent("100", 100, 100)
    expect(torrent.progress).toBe(1)
  })

  it("returns progress 1 when aMule reports over 100", async () => {
    const torrent = await getInfoTorrent("150", 100, 100)
    expect(torrent.progress).toBe(1)
  })

  it("returns progress 0.5 when aMule reports 50", async () => {
    const torrent = await getInfoTorrent("50", 100, 50)
    expect(torrent.progress).toBe(0.5)
  })

  it("returns amount_left 0 when downloaded exceeds size", async () => {
    const torrent = await getInfoTorrent("100", 100, 150, 10)
    expect(torrent.amount_left).toBe(0)
  })

  it("returns non-negative eta when downloaded exceeds size", async () => {
    const torrent = await getInfoTorrent("100", 100, 150, 10)
    expect(torrent.eta).toBeGreaterThanOrEqual(0)
    expect(torrent.eta).toBe(0)
  })

  it("deduplicates shared files against downloads case-insensitively", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: "downloading.pdf",
            fileSize: 100,
            fileSizeDownloaded: 50,
            progress: "50",
            speed: 10,
            status: 3,
          },
        ],
        getSharedFiles: async () => [
          {
            fileHash: ED2K.toLowerCase(),
            fileName: "shared-same-hash.pdf",
            fileSize: 100,
            path: "/shared",
          },
        ],
        getCategories: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.info")
    const response = await getHandler(Route)({
      request: new Request("http://x/api/v2/torrents/info"),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe("downloading.pdf")
  })
})

describe("torrents/files and torrents/contents", () => {
  it("GET /torrents/files returns 404 for invalid hash without aMule", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockClear()
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request("http://x/api/v2/torrents/files?hash=bad"),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
    expect(useAmule).not.toHaveBeenCalled()
  })

  it("GET /torrents/files returns partial download with 0..1 progress and is_seed false", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: "book.pdf",
            fileSize: 100,
            fileSizeDownloaded: 50,
          },
        ],
        getSharedFiles: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([
      {
        index: 0,
        name: "book.pdf",
        size: 100,
        progress: 0.5,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
    expect(body[0].progress).toBeGreaterThanOrEqual(0)
    expect(body[0].progress).toBeLessThanOrEqual(1)
  })

  it("GET /torrents/files defaults missing name/size and uses zero progress", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: "",
        size: 0,
        progress: 0,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
  })

  it("GET /torrents/files returns completed download with progress 1 and is_seed true", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: "book.pdf",
            fileSize: 100,
            fileSizeDownloaded: 100,
          },
        ],
        getSharedFiles: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: "book.pdf",
        size: 100,
        progress: 1,
        priority: 1,
        is_seed: true,
        availability: 1,
      },
    ])
  })

  it("GET /torrents/files returns shared file with progress 1 and is_seed true", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => [
          {
            fileHash: ED2K,
            fileName: "shared.pdf",
            fileSize: 42,
          },
        ],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: "shared.pdf",
        size: 42,
        progress: 1,
        priority: 1,
        is_seed: true,
        availability: 1,
      },
    ])
  })

  it("POST /torrents/contents mirrors GET /torrents/files for the same hash", async () => {
    const { useAmule } = await import("#/amule")
    const amuleData = {
      getDownloadQueue: async () => [
        {
          fileHash: ED2K,
          fileName: "book.pdf",
          fileSize: 100,
          fileSizeDownloaded: 25,
        },
      ],
      getSharedFiles: async () => [],
    }
    vi.mocked(useAmule)
      .mockImplementationOnce(async (fn) => fn(amuleData))
      .mockImplementationOnce(async (fn) => fn(amuleData))

    const { Route: filesRoute } = await import("#/routes/api.v2.torrents.files")
    const filesResponse = await getHandler(filesRoute)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })

    const { Route: contentsRoute } = await import("#/routes/api.v2.torrents.contents")
    const contentsResponse = await getHandler(contentsRoute, "POST")({
      request: new Request("http://x/api/v2/torrents/contents", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ hash: BTIH }),
      }),
    })

    expect(filesResponse.status).toBe(200)
    expect(contentsResponse.status).toBe(200)
    expect(await contentsResponse.json()).toEqual(await filesResponse.json())
  })

  it("POST /torrents/contents falls back to query hash when body hash is empty", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: "book.pdf",
            fileSize: 100,
            fileSizeDownloaded: 50,
          },
        ],
        getSharedFiles: async () => [],
      })
    )
    const { Route } = await import("#/routes/api.v2.torrents.contents")
    const response = await getHandler(Route, "POST")({
      request: new Request(`http://x/api/v2/torrents/contents?hash=${BTIH}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ hash: "" }),
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: "book.pdf",
        size: 100,
        progress: 0.5,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
  })

  it("POST /torrents/contents returns 404 for invalid hash", async () => {
    const { useAmule } = await import("#/amule")
    vi.mocked(useAmule).mockClear()
    const { Route } = await import("#/routes/api.v2.torrents.contents")
    const body = new URLSearchParams({ hash: "not-a-hash" })
    const response = await getHandler(Route, "POST")({
      request: new Request("http://x/api/v2/torrents/contents", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
    expect(useAmule).not.toHaveBeenCalled()
  })

  it("POST /torrents/contents returns 404 for unknown hash", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.contents")
    const body = new URLSearchParams({ hash: BTIH })
    const response = await getHandler(Route, "POST")({
      request: new Request("http://x/api/v2/torrents/contents", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
  })

  it("GET /torrents/files returns 404 for unknown hash", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.files")
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
  })
})
