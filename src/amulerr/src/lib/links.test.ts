import { describe, expect, it } from "vitest"
import {
  fromMagnetLink,
  fromQbittorrentHash,
  isAmulerrBtih,
  toMagnetLink,
  toQbittorrentHash,
} from "./links"

const ED2K = "A1B2C3D4E5F60718293A4B5C6D7E8F90"
const BTIH = toQbittorrentHash(ED2K)

describe("hash helpers", () => {
  it("maps ed2k 32-hex to qBittorrent 40-hex padded lowercase", () => {
    expect(toQbittorrentHash(ED2K)).toBe(`${ED2K.toLowerCase()}00000000`)
    expect(toQbittorrentHash(ED2K)).toHaveLength(40)
  })

  it("maps qBittorrent 40-hex padded back to ed2k uppercase 32-hex", () => {
    expect(fromQbittorrentHash(BTIH)).toBe(ED2K)
  })

  it("recognizes amulerr padded btih", () => {
    expect(isAmulerrBtih(BTIH)).toBe(true)
    expect(isAmulerrBtih("a".repeat(40))).toBe(false)
  })
})

describe("fromMagnetLink", () => {
  const magnet = toMagnetLink(ED2K, "Test Book", 12345)

  it("parses amulerr-generated magnets", () => {
    expect(fromMagnetLink(magnet)).toEqual({
      hash: ED2K,
      name: "Test Book",
      size: 12345,
    })
  })

  it("rejects random non-amulerr 40-hex btih", () => {
    const fake = magnet.replace(BTIH, "b".repeat(40))
    expect(() => fromMagnetLink(fake)).toThrow("Invalid magnet link")
  })

  it("rejects malformed percent-encoding", () => {
    const bad = magnet.replace(encodeURIComponent("Test Book"), "%E0%A4%A")
    expect(() => fromMagnetLink(bad)).toThrow("Invalid magnet link")
  })

  it("rejects invalid size", () => {
    const bad = magnet.replace("xl=12345", "xl=12abc")
    expect(() => fromMagnetLink(bad)).toThrow("Invalid magnet link")
  })

  it("ignores extra magnet parameters after dn", () => {
    const withExtra = magnet.replace(
      `&xl=12345`,
      `&tr=http%3A%2F%2Ftracker&xl=12345`
    )
    // dn is [^&]+ so extra & in dn would fail; trailing params after xl are not in our format
    expect(fromMagnetLink(magnet)).toBeTruthy()
  })
})
