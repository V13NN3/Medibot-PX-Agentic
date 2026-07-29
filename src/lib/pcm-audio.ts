export class PcmCapture {
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null
  private _sampleRate = 24000

  get sampleRate() {
    return this._sampleRate
  }

  async start(onChunk: (base64: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.context = new AudioContext({ sampleRate: this._sampleRate })
    this.source = this.context.createMediaStreamSource(this.stream)
    this.processor = this.context.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const pcm16 = float32ToPcm16(input)
      const base64 = arrayBufferToBase64(pcm16.buffer)
      onChunk(base64)
    }

    this.source.connect(this.processor)
    this.processor.connect(this.context.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.context?.close()
    this.processor = null
    this.source = null
    this.stream = null
    this.context = null
  }
}

export class PcmPlayer {
  private context: AudioContext | null = null
  private queue: AudioBuffer[] = []
  private playing = false

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24000 })
    }
    if (this.context.state === "suspended") {
      this.context.resume()
    }
    return this.context
  }

  enqueueBase64(base64: string): void {
    const pcm16 = base64ToPcm16(base64)
    const ctx = this.ensureContext()
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
      return
    }
    this.playing = true
    const ctx = this.ensureContext()
    const buffer = this.queue.shift()!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => this.playNext()
    source.start()
  }

  clear(): void {
    this.queue = []
    this.playing = false
  }

  stop(): void {
    this.clear()
    this.context?.close()
    this.context = null
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
