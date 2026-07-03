import { describe, expect, it, vi } from "vitest"
import {
  defaultQbittorrentPreferences,
  QBITTORRENT_WEBAPI_VERSION,
  qbittorrentTorrentExtras,
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
})

describe("app routes", () => {
  it("/api/v2/app/webapiVersion returns text/plain semver", async () => {
    const { Route } = await import("#/routes/api.v2.app.webapiVersion")
    const response = await getHandler(Route)()
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/plain")
    expect(await response.text()).toBe(QBITTORRENT_WEBAPI_VERSION)
  })

  it("/api/v2/app/version returns qBittorrent-like version text", async () => {
    const { Route } = await import("#/routes/api.v2.app.version")
    const response = await getHandler(Route)()
    expect(response.headers.get("Content-Type")).toBe("text/plain")
    expect(await response.text()).toMatch(/^v/)
  })

  it("/api/v2/app/preferences returns required JSON fields", async () => {
    const { Route } = await import("#/routes/api.v2.app.preferences")
    const response = await getHandler(Route)()
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
  it("setShareLimits returns Ok", async () => {
    const { Route } = await import("#/routes/api.v2.torrents.setShareLimits")
    const response = await getHandler(Route, "POST")({ request: new Request("http://x", { method: "POST" }) })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("Ok")
  })
})

const ED2K = "A1B2C3D4E5F60718293A4B5C6D7E8F90"
const BTIH = `${ED2K.toLowerCase()}00000000`

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
