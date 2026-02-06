import base32 from "hi-base32"

export function toMagnetLink(hash: string, name: string, size: number) {
  const hashBuffer = Buffer.from(hash, "hex")
  const base32Buffer = Buffer.alloc(20, "\0")
  hashBuffer.copy(base32Buffer)
  const base32Hash = base32.encode(base32Buffer).toUpperCase()

  return `magnet:?xt=urn:btih:${base32Hash}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://emulerr`
}

/** Detect if btih value is hex (40 chars) or base32 (32 chars) */
function parseBtih(btih: string): string {
  if (/^[0-9a-fA-F]{40}$/.test(btih)) {
    return btih.substring(0, 32).toUpperCase()
  }
  const b32 = btih.toUpperCase()
  if (/^[A-Z2-7]{32}$/.test(b32)) {
    return Buffer.from(base32.decode.asBytes(b32))
      .subarray(0, 16)
      .toString("hex")
      .toUpperCase()
  }
  throw new Error("Invalid magnet link: unsupported btih format")
}

export function fromMagnetLink(magnetLink: string) {
  if (!magnetLink.startsWith("magnet:?")) {
    throw new Error("Invalid magnet link")
  }

  const params = new URLSearchParams(magnetLink.slice(8))
  const xt = params.get("xt")
  const btih = xt?.startsWith("urn:btih:") ? xt.slice(9) : null
  if (!btih) {
    throw new Error("Invalid magnet link: missing xt=urn:btih")
  }

  const name = params.get("dn") ?? ""
  const sizeStr = params.get("xl")
  const size = sizeStr ? parseInt(sizeStr, 10) : 0

  if (!name || isNaN(size) || size <= 0) {
    throw new Error("Invalid magnet link: missing dn or xl")
  }

  const hash = parseBtih(btih)
  return { hash, name: decodeURIComponent(name), size }
}

export function toEd2kLink(hash: string, name: string, size: number) {
  return `ed2k://|file|${name}|${size}|${hash}|/`
}

export function fromEd2kLink(ed2kLink: string) {
  const extractEd2kLinkInfo =
    /ed2k:\/\/\|file\|(?<name>[^\|]+)\|(?<size>[^\|]+)\|(?<hash>[^\|]+)\|/

  const { hash, name, size } = extractEd2kLinkInfo.exec(ed2kLink)?.groups ?? {}

  if (!hash || !name || !size) {
    throw new Error("Invalid ed2k link")
  }

  return { hash, name: decodeURIComponent(name), size: parseInt(size) }
}
