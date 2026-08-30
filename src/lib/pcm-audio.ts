let sharedContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    try {
      sharedContext = new AudioContext({ sampleRate: 24000 })
    } catch {
      sharedContext = new AudioContext()
    }
  }
  return sharedContext
}

export async function unlockAudio(): Promise<void> {
  let ctx = getAudioContext()
  if (ctx.state === "closed") {
    console.log("[audio] context was closed, recreating")
    sharedContext = null
    ctx = getAudioContext()
  }
  if (ctx.state === "suspended") {
    console.log("[audio] ctx.state=suspended, resuming")
    try {
      await ctx.resume()
    } catch (err) {
      console.warn("[audio] resume failed:", err)
    }
  }
  if (ctx.state !== "running") {
    console.log("[audio] ctx.state=" + ctx.state + ", recreating fresh context")
    try {
      await ctx.close()
    } catch {
      /* ignore */
    }
    sharedContext = null
    ctx = getAudioContext()
    if (ctx.state === "suspended") {
      try {
        await ctx.resume()
      } catch (err) {
        console.warn("[audio] resume on fresh context failed:", err)
      }
    }
  }
  console.log("[audio] unlockAudio done, ctx.state=" + ctx.state)
}

export async function requestMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true })
}

export class PcmCapture {
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null

  async start(
    onChunk: (base64: string, float32: Float32Array) => void,
    stream?: MediaStream,
  ): Promise<void> {
    const ctx = getAudioContext()
    console.log("[audio] PcmCapture.start, ctx.state=" + ctx.state)
    if (ctx.state === "suspended") {
      await ctx.resume()
    }
    this.stream = stream ?? (await requestMic())
    this.source = ctx.createMediaStreamSource(this.stream)
    this.processor = ctx.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const pcm16 = float32ToPcm16(input)
      const base64 = arrayBufferToBase64(pcm16.buffer)
      onChunk(base64, input)
    }

    this.source.connect(this.processor)
    this.processor.connect(ctx.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.processor = null
    this.source = null
    this.stream = null
  }
}

export class PcmPlayer {
  private queue: AudioBuffer[] = []
  private playing = false
  private currentSource: AudioBufferSourceNode | null = null
  onDrain: (() => void) | null = null

  async enqueueBase64(base64: string): Promise<void> {
    if (!base64) return
    const pcm16 = base64ToPcm16(base64)
    if (pcm16.length === 0) return
    let ctx = getAudioContext()
    if (ctx.state === "suspended") {
      console.log("[audio] enqueue: ctx suspended, resuming")
      await ctx.resume().catch(() => {})
    }
    if (ctx.state !== "running") {
      console.log("[audio] enqueue: ctx.state=" + ctx.state + ", recreating")
      await ctx.close().catch(() => {})
      sharedContext = null
      ctx = getAudioContext()
      await ctx.resume().catch(() => {})
    }
    const buffer = ctx.createBuffer(1, pcm16.length, 24000)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < pcm16.length; i++) {
      channel[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff)
    }
    this.queue.push(buffer)
    if (!this.playing) this.playNext()
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.playing = false
      this.currentSource = null
      this.onDrain?.()
      return
    }
    this.playing = true
    const ctx = getAudioContext()
    const buffer = this.queue.shift()!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    this.currentSource = source
    source.onended = () => {
      if (this.currentSource === source) this.currentSource = null
      this.playNext()
    }
    source.start()
  }

  clear(): void {
    this.queue = []
    this.playing = false
    this.currentSource?.stop()
    this.currentSource = null
  }

  stop(): void {
    this.clear()
    this.onDrain = null
  }
}

function float32ToPcm16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Int16Array(bytes.buffer)
}