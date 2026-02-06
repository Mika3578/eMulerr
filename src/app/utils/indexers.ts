import { skipFalsy } from "./array"
import { encode } from "html-entities"
import { buildRFC822Date } from "./time"
import { logger } from "./logger"
import { readableSize } from "./math"
import { searchAndWaitForResults } from "~/data/search"

// Torznab category IDs
const VIDEO_CATS = [2000, 5000] // Movies, TV
const BOOK_CATS = [8000, 8010, 8030, 7020, 7030, 7040] // Books, Ebooks, Magazines, Other/EBook, Other/Comics, Other/Magazines
const AUDIO_CATS = [3030] // Audio

const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "wmv", "mpeg", "mpg"]
const EBOOK_EXTENSIONS = ["epub", "mobi", "azw3", "azw", "djvu", "fb2"]
const MAGAZINE_EXTENSIONS = ["cbz", "cbr", "cbt", "rar", "zip", "7z"]
// pdf appears in both ebook and magazine; union for book-related categories
const BOOK_EXTENSIONS = ["epub", "pdf", "mobi", "azw", "azw3", "djvu", "fb2", "cbz", "cbr", "cbt", "rar", "zip", "7z"]
const AUDIO_EXTENSIONS = ["mp3", "m4a", "m4b", "flac", "ogg", "aac"]

function getAllowedExtensions(categories: number[]): string[] {
  if (categories.length === 0) {
    return [...VIDEO_EXTENSIONS, ...BOOK_EXTENSIONS, ...AUDIO_EXTENSIONS]
  }
  const hasVideo = categories.some((c) => VIDEO_CATS.includes(c))
  const hasBook = categories.some((c) => BOOK_CATS.includes(c))
  const hasAudio = categories.some((c) => AUDIO_CATS.includes(c))
  // Unknown cats (7000 Other, 10000 All) -> allow all
  const hasOther = categories.some((c) => [7000, 10000].includes(c))
  if (hasOther && !hasVideo && !hasBook && !hasAudio) {
    return [...VIDEO_EXTENSIONS, ...BOOK_EXTENSIONS, ...AUDIO_EXTENSIONS]
  }
  const exts: string[] = []
  if (hasVideo) exts.push(...VIDEO_EXTENSIONS)
  if (hasBook) exts.push(...BOOK_EXTENSIONS)
  if (hasAudio) exts.push(...AUDIO_EXTENSIONS)
  return exts.length > 0 ? exts : [...VIDEO_EXTENSIONS, ...BOOK_EXTENSIONS, ...AUDIO_EXTENSIONS]
}

/** Whether search needs low minSize (ebooks/mags are small). LazyLibrarian uses t=search with no cat for generalbook. */
export function isBookSearch(categories: number[]): boolean {
  if (categories.length === 0) return true // no cat = allow all, incl. ebooks
  return categories.some((c) => BOOK_CATS.includes(c) || [7000, 10000].includes(c))
}

export const fakeItem = {
  name: "FAKE",
  short_name: "FAKE",
  hash: "00000000000000000000000000000000",
  size: 1,
  sources: 1,
  present: false,
  magnetLink: "http://emulerr/fake",
  ed2kLink: "http://emulerr/fake",
}

export const emptyResponse = () => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="0"/>
    </channel>
  </rss>`

export async function search(
  q: string,
  categories: number[] = []
): Promise<Awaited<ReturnType<typeof searchAndWaitForResults>>> {
  const minSize = isBookSearch(categories) ? 0 : undefined
  const searchResults = await searchAndWaitForResults(q, { minSize })
  const allowedExts = getAllowedExtensions(categories)
  const { allowed, skipped } = searchResults.reduce(
    (prev, curr) => {
      const ext = curr.name.split(".").pop()?.toLowerCase()
      if (ext && allowedExts.includes(ext)) {
        prev.allowed.push(curr)
      } else {
        prev.skipped.push(curr)
      }
      return prev
    },
    { allowed: [] as typeof searchResults, skipped: [] as typeof searchResults }
  )

  if (skipped.length > 0) {
    logger.debug(
      `${skipped.length} results excluded (categories=${categories.join(",")}, allowed=${allowedExts.join(",")}):`
    )
    skipped.forEach((r) => {
      logger.debug(`\t- ${r.name} (${readableSize(r.size)})`)
    })
  }

  return allowed
}

export const itemsResponse = (
  searchResults: Awaited<ReturnType<typeof search>>,
  categories: number[]
) => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="${searchResults.length}"/>
      ${searchResults.map(
  (item) => `
          <item>
            <title>${encode(item.name)}</title>
            <link>${encode(item.magnetLink)}</link>
            <guid>${item.hash}-${encode(item.name)}</guid>
            <pubDate>${buildRFC822Date(new Date())}</pubDate>
            <enclosure url="${encode(item.magnetLink)}" length="${item.size}" type="application/x-bittorrent;x-scheme-handler/magnet" />
            <torznab:attr name="size" value="${item.size}" />
            ${categories.map((c) => `<torznab:attr name="category" value="${c}" />`).join("")}
            <torznab:attr name="seeders" value="${item.sources}" />
            <torznab:attr name="downloadvolumefactor" value="0" />
            <torznab:attr name="uploadvolumefactor" value="0" />
            <torznab:attr name="minimumratio" value="0" />
            <torznab:attr name="minimumseedtime" value="0" />
            <torznab:attr name="tag" value="freeleech" />
          </item>`
)}
    </channel>
  </rss>
  `

export function group<T>(
  arr: T[],
  operator: "AND" | "OR",
  parenthesis: boolean
) {
  arr = arr.filter(skipFalsy)

  const joined =
    operator === "OR"
      ? arr.join(` ${operator} `)
      : arr
        .sort(
          // move parenthesis to the end
          (a, b) =>
            (typeof a === "string" && a.startsWith("(") ? 1 : 0) -
            (typeof b === "string" && b.startsWith("(") ? 1 : 0)
        )
        .reduce(
          (prev, curr) =>
            prev === ""
              ? `${curr}`
              : prev.endsWith(")") ||
                (typeof curr === "string" && curr.startsWith("("))
                ? `${prev} AND ${curr}`
                : `${prev} ${curr}`,
          ""
        )

  if (!parenthesis) {
    return joined
  }

  return arr.length > 1 ? `(${joined})` : `${arr[0] ?? ""}`
}
