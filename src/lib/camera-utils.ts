"use client"

export async function fetchStreamFrame(streamUrl: string): Promise<string> {
  const res = await fetch(streamUrl)
  if (!res.ok || !res.body) throw new Error("stream fetch failed")

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let totalLen = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) throw new Error("stream ended before frame")
      chunks.push(value)
      totalLen += value.length

      const merged = new Uint8Array(totalLen)
      let offset = 0
      for (const c of chunks) {
        merged.set(c, offset)
        offset += c.length
      }

      const soi = findSOI(merged)
      if (soi === -1) continue

      const eoi = findEOI(merged, soi + 2)
      if (eoi === -1) continue

      const frame = merged.slice(soi, eoi + 2)
      let binary = ""
      for (let i = 0; i < frame.length; i++) {
        binary += String.fromCharCode(frame[i])
      }
      return btoa(binary)
    }
  } finally {
    reader.cancel().catch(() => {})
    res.body.cancel().catch(() => {})
  }
}

function findSOI(buf: Uint8Array): number {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) return i
  }
  return -1
}

function findEOI(buf: Uint8Array, from: number): number {
  for (let i = from; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd9) return i
  }
  return -1
}
