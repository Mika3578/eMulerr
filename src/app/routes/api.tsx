import { LoaderFunction } from "@remix-run/node"
import { logger } from "~/utils/logger"
import { skipFalsy } from "~/utils/array"
import {
  emptyResponse,
  fakeItem,
  group,
  itemsResponse,
  search,
  bookSearch,
} from "~/utils/indexers"

export const loader = (async ({ request }) => {
  const content = await handleTorznabRequest(request)
  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>${content}`, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })
}) satisfies LoaderFunction

async function handleTorznabRequest(request: Request) {
  logger.debug("URL", request.url)
  const url = new URL(request.url)

  switch (url.searchParams.get("t")) {
    case "caps":
      return caps(url)
    case "search":
      return await rawSearch(url)
    case "tvsearch":
      return await tvSearch(url)
    case "book":
      return await bookSearchHandler(url)
    default:
      throw Error("NOT IMPLEMENTED")
  }
}

function caps(_url: URL) {
  return `
<caps xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <server version="1.0" title="eMulerr" strapline="eMulerr" />
  <limits min="100000" max="100000" default="100000"/>
  <retention days="1"/>
  <registration available="no" open="no" />
  <searching>
    <search available="yes" supportedParams="q" searchEngine="raw"/>
    <movie-search available="no"/>
    <tv-search available="yes" supportedParams="q,season,ep" searchEngine="raw"/>
    <book-search available="yes" supportedParams="q" searchEngine="raw"/>
  </searching>
  <categories>
    <category id="2000" name="Movies" />
    <category id="5000" name="TV" />
    <category id="7000" name="Other" />
    <category id="8010" name="Books/Ebooks" />
    <category id="8030" name="Audiobooks" />
    <category id="10000" name="All" />
  </categories>
  <tags>
    <tag name="freeleech" description="FreeLeech" />
  </tags>
</caps>`
}

const BOOK_CATEGORIES = [8010, 8030, 8000] // Books/Ebooks, Audiobooks, Books
const VIDEO_CATEGORIES = [2000, 5000, 7000] // Movies, TV, Other

async function rawSearch(url: URL) {
  const q = sanitizeQuery(url.searchParams.get("q"))
  const offset = url.searchParams.get("offset")
  const cat =
    url.searchParams
      .get("cat")
      ?.toString()
      ?.split(",")
      ?.map((x) => parseInt(x)) ?? []

  // avoid duplicated entries
  if (offset && offset !== "0") {
    return emptyResponse()
  }

  // rss sync
  if (!q) {
    return itemsResponse([fakeItem], cat)
  }

  // LazyLibrarian uses t=search for books (not t=book). Use bookSearch when cat
  // requests books, or when no cat filter (return both video and book for compatibility).
  const wantsBooks = cat.length === 0 || cat.some((c) => BOOK_CATEGORIES.includes(c))
  const wantsVideo = cat.length === 0 || cat.some((c) => VIDEO_CATEGORIES.includes(c))

  const [videoResults, bookResults] = await Promise.all([
    wantsVideo ? search(q) : Promise.resolve([]),
    wantsBooks ? bookSearch(q) : Promise.resolve([]),
  ])

  // Dedupe by hash+size, prefer video when both match (for Radarr/Sonarr)
  const seen = new Set<string>()
  const searchResults = [...videoResults, ...bookResults].filter((r) => {
    const key = `${r.hash}-${r.size}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return itemsResponse(searchResults, cat)
}

async function tvSearch(url: URL) {
  const q = sanitizeQuery(url.searchParams.get("q")?.toString())
  const season = url.searchParams.get("season")?.toString()
  const episode = url.searchParams.get("ep")?.toString()
  const offset = url.searchParams.get("offset")?.toString()
  const cat =
    url.searchParams
      .get("cat")
      ?.toString()
      ?.split(",")
      ?.map((x) => parseInt(x)) ?? []

  // avoid duplicated entries
  if (offset && offset !== "0") {
    return emptyResponse()
  }

  // rss sync
  if (!q) {
    return itemsResponse([fakeItem], cat)
  }

  const episodeQuery = [
    ...new Set(
      season && episode
        ? ["/", "-"].some((c) => episode.includes(c)) // daily episode
          ? [`${season}/${episode}`]
          : [
              `${season}x${episode}`,
              `${season}x${episode.padStart(2, "0")}`,
              `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`,
              `S${season}E${episode}`,
            ]
        : season
          ? season.length === 4 // daily episode
            ? [season]
            : [`${season}x`, `S${season.padStart(2, "0")}`, `S${season}`]
          : []
    ),
  ].filter(skipFalsy)

  const episodeFilter = group(episodeQuery, "OR", true)
  const query = group([q, episodeFilter], "AND", false)
  const searchResults = await search(query)
  return itemsResponse(searchResults, cat)
}

async function bookSearchHandler(url: URL) {
  const q = sanitizeQuery(url.searchParams.get("q"))
  const offset = url.searchParams.get("offset")
  const cat =
    url.searchParams
      .get("cat")
      ?.toString()
      ?.split(",")
      ?.map((x) => parseInt(x)) ?? []

  // avoid duplicated entries
  if (offset && offset !== "0") {
    return emptyResponse()
  }

  // rss sync
  if (!q) {
    return itemsResponse([fakeItem], cat)
  }

  const searchResults = await bookSearch(q)
  return itemsResponse(searchResults, cat)
}

function sanitizeQuery(q: string | undefined | null) {
  if (!q) {
    return q
  }

  return q
    .normalize("NFKD")
    .replace(/[\u0100-\uFFFF]/g, "")
    .replace(/[^\w '-]/g, " ")
    .replace(/ +/g, " ")
    .trim()
}
