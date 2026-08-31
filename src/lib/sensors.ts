export interface VitalsReading {
  weight_kg: number
  height_cm: number
  temperature_c: number
  oxygen_saturation: number
  heart_rate: number
  _source: string
}

export async function readVitals(): Promise<VitalsReading> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"

  if (isRpi) {
    try {
      const mod = "i2c-bus"
      const { default: i2c } = await import(/* webpackIgnore: true */ mod)
      const bus = i2c.openSync(parseInt(process.env.I2C_BUS || "1", 10))

      const weight = readWeightI2C(bus)
      const temp = readTemperatureI2C(bus)
      const oximeter = readOximeterI2C(bus)
      const height = readHeightI2C(bus)

      bus.closeSync()

      return {
        weight_kg: weight,
        height_cm: height,
        temperature_c: temp,
        oxygen_saturation: oximeter.spo2,
        heart_rate: oximeter.hr,
        _source: "sensor",
      }
    } catch (err) {
      console.error("[sensors] I2C error, falling back to mock:", err)
    }
  }

  return {
    weight_kg: 66,
    height_cm: 163,
    temperature_c: 36.6,
    oxygen_saturation: 98.0,
    heart_rate: 72,
    _source: "mock",
  }
}

function readWeightI2C(bus: { readByteSync: (addr: number, cmd: number) => number }): number {
  const addr = 0x20
  const data = Buffer.alloc(4)
  for (let i = 0; i < 4; i++) data[i] = bus.readByteSync(addr, i)
  return data.readInt32LE(0) / 1000
}

function readTemperatureI2C(bus: { readWordSync: (addr: number, cmd: number) => number }): number {
  const addr = 0x48
  const raw = bus.readWordSync(addr, 0)
  return (raw & 0xfff) * 0.0625
}

function readOximeterI2C(bus: { readByteSync: (addr: number, cmd: number) => number }): { spo2: number; hr: number } {
  const addr = 0x57
  const spo2 = bus.readByteSync(addr, 0x04)
  const hr = bus.readByteSync(addr, 0x05)
  return { spo2, hr }
}

function readHeightI2C(bus: { readByteSync: (addr: number, cmd: number) => number }): number {
  const addr = 0x76
  try {
    const raw = bus.readByteSync(addr, 0x00)
    return 100 + raw
  } catch {
    return 172
  }
}

let _i2cMod: any = null
async function getI2c() {
  if (!_i2cMod) {
    const mod = "i2c-bus"
    _i2cMod = await import(/* webpackIgnore: true */ mod)
  }
  return _i2cMod.default || _i2cMod
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10
}

export function fallbackO2(gender: "male" | "female" | "unknown"): number {
  const base = gender === "female" ? 98.2 : gender === "male" ? 97.4 : 97.8
  return Math.round(base + (Math.random() * 1.6 - 0.8))
}

export function fallbackHR(gender: "male" | "female" | "unknown"): number {
  const base = gender === "female" ? 76 : gender === "male" ? 70 : 73
  return Math.round(base + (Math.random() * 8 - 4))
}

export function fallbackWeight(estimatedKg: number): number {
  const offset = Math.random() * 6 - 3
  return Math.round((estimatedKg + offset) * 10) / 10
}

const MAX30102_ADDR = 0x57
const MAX30102_BUS = 10

const MAX30102_REG_INTR_STATUS_1 = 0x00
const MAX30102_REG_INTR_STATUS_2 = 0x01
const MAX30102_REG_INTR_ENABLE_1 = 0x02
const MAX30102_REG_INTR_ENABLE_2 = 0x03
const MAX30102_REG_FIFO_WR_PTR = 0x04
const MAX30102_REG_OVF_COUNTER = 0x05
const MAX30102_REG_FIFO_RD_PTR = 0x06
const MAX30102_REG_FIFO_DATA = 0x07
const MAX30102_REG_FIFO_CONFIG = 0x08
const MAX30102_REG_MODE_CONFIG = 0x09
const MAX30102_REG_SPO2_CONFIG = 0x0A
const MAX30102_REG_LED1_PA = 0x0C
const MAX30102_REG_LED2_PA = 0x0D
const MAX30102_REG_MULTILED_1 = 0x11
const MAX30102_REG_MULTILED_2 = 0x12
const MAX30102_REG_REV_ID = 0xFE

function max30102WriteByte(bus: any, reg: number, val: number) {
  bus.writeByteSync(MAX30102_ADDR, reg, val)
}

function max30102ReadByte(bus: any, reg: number): number {
  return bus.readByteSync(MAX30102_ADDR, reg)
}

function max30102Init(bus: any) {
  max30102WriteByte(bus, MAX30102_REG_MODE_CONFIG, 0x40)
  const sleep = (ms: number) => {
    const end = Date.now() + ms
    while (Date.now() < end) { /* spin */ }
  }
  sleep(150)

  max30102WriteByte(bus, MAX30102_REG_INTR_ENABLE_1, 0x00)
  max30102WriteByte(bus, MAX30102_REG_INTR_ENABLE_2, 0x00)

  max30102WriteByte(bus, MAX30102_REG_FIFO_WR_PTR, 0x00)
  max30102WriteByte(bus, MAX30102_REG_OVF_COUNTER, 0x00)
  max30102WriteByte(bus, MAX30102_REG_FIFO_RD_PTR, 0x00)

  max30102WriteByte(bus, MAX30102_REG_FIFO_CONFIG, 0x4F)

  max30102WriteByte(bus, MAX30102_REG_MODE_CONFIG, 0x03)

  max30102WriteByte(bus, MAX30102_REG_SPO2_CONFIG, 0x27)

  max30102WriteByte(bus, MAX30102_REG_LED1_PA, 0x3F)
  max30102WriteByte(bus, MAX30102_REG_LED2_PA, 0x3F)

  max30102WriteByte(bus, MAX30102_REG_MULTILED_1, 0x21)
  max30102WriteByte(bus, MAX30102_REG_MULTILED_2, 0x12)

  const revId = max30102ReadByte(bus, MAX30102_REG_REV_ID)
  console.log(`[sensors] MAX30102 init OK, rev=0x${revId.toString(16)}`)
}

function max30102ReadFifoSample(bus: any): { red: number; ir: number } | null {
  try {
    const buf = Buffer.alloc(6)
    const result = bus.readI2cBlockSync(MAX30102_ADDR, MAX30102_REG_FIFO_DATA, 6, buf)
    if (!result || !result.bytesRead || result.bytesRead < 6) return null
    const red = ((buf[0] << 16) | (buf[1] << 8) | buf[2]) & 0x0003FFFF
    const ir = ((buf[3] << 16) | (buf[4] << 8) | buf[5]) & 0x0003FFFF
    return { red, ir }
  } catch {
    return null
  }
}

function max30102WaitForFifo(bus: any, samplesNeeded: number, timeoutMs: number): { red: number[]; ir: number[] } {
  const red: number[] = []
  const ir: number[] = []
  const deadline = Date.now() + timeoutMs

  while (red.length < samplesNeeded && Date.now() < deadline) {
    const wrPtr = max30102ReadByte(bus, MAX30102_REG_FIFO_WR_PTR) & 0x1F
    const rdPtr = max30102ReadByte(bus, MAX30102_REG_FIFO_RD_PTR) & 0x1F
    const available = (wrPtr - rdPtr + 32) % 32

    if (available >= 1) {
      const sample = max30102ReadFifoSample(bus)
      if (sample && (sample.red > 0 || sample.ir > 0)) {
        red.push(sample.red)
        ir.push(sample.ir)
      }
    } else {
      const sleep2 = (ms: number) => {
        const end = Date.now() + ms
        while (Date.now() < end) { /* spin */ }
      }
      sleep2(10)
    }
  }

  return { red, ir }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

function calcSpO2(redSamples: number[], irSamples: number[]): number {
  const dcRed = mean(redSamples)
  const dcIr = mean(irSamples)
  const acRed = stddev(redSamples)
  const acIr = stddev(irSamples)

  if (dcRed === 0 || dcIr === 0 || acIr === 0) return 0

  const r = (acRed / dcRed) / (acIr / dcIr)
  let spo2 = 110 - 25 * r
  spo2 = Math.max(70, Math.min(100, spo2))
  return Math.round(spo2 * 10) / 10
}

function calcHR(irSamples: number[], sampleRateHz: number): number {
  if (irSamples.length < 10) return 0

  const m = mean(irSamples)
  const filtered = irSamples.map((v) => v - m)

  const threshold = stddev(irSamples) * 0.5
  if (threshold === 0) return 0

  const peaks: number[] = []
  for (let i = 1; i < filtered.length - 1; i++) {
    if (filtered[i] > threshold && filtered[i] > filtered[i - 1] && filtered[i] >= filtered[i + 1]) {
      peaks.push(i)
    }
  }

  if (peaks.length < 2) return 0

  const intervals: number[] = []
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1])
  }

  const avgInterval = mean(intervals)
  if (avgInterval === 0) return 0

  const hr = (60 * sampleRateHz) / avgInterval
  return Math.round(Math.max(40, Math.min(200, hr)))
}

let _pulseInitDone = false

export async function readPulseSensor(): Promise<{ o2_percentage: number; heart_rate: number; raw_adc_o2: number; raw_adc_hr: number } | null> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"
  if (!isRpi) return { o2_percentage: 97.8, heart_rate: 73, raw_adc_o2: 0, raw_adc_hr: 0 }

  const i2c = await getI2c()
  for (let attempt = 1; attempt <= 3; attempt++) {
    let bus: any = null
    try {
      bus = i2c.openSync(MAX30102_BUS)

      if (!_pulseInitDone) {
        max30102Init(bus)
        _pulseInitDone = true
        const sleep = (ms: number) => {
          const end = Date.now() + ms
          while (Date.now() < end) { /* spin */ }
        }
        sleep(200)
      }

      const samplesNeeded = 100
      const timeoutMs = 2000
      console.log(`[sensors] MAX30102: reading ${samplesNeeded} FIFO samples from bus ${MAX30102_BUS}...`)
      const { red, ir } = max30102WaitForFifo(bus, samplesNeeded, timeoutMs)
      console.log(`[sensors] MAX30102: got ${red.length} samples`)

      if (red.length < 10) {
        console.warn("[sensors] MAX30102: insufficient samples, re-initializing...")
        _pulseInitDone = false
        continue
      }

      const sampleRateHz = 100
      const spo2 = calcSpO2(red, ir)
      const hr = calcHR(ir, sampleRateHz)

      console.log(`[sensors] MAX30102 result: SpO2=${spo2}% HR=${hr}bpm (dcRed=${mean(red).toFixed(0)} dcIr=${mean(ir).toFixed(0)} acRed=${stddev(red).toFixed(0)} acIr=${stddev(ir).toFixed(0)})`)

      return { o2_percentage: spo2, heart_rate: hr, raw_adc_o2: Math.round(mean(red)), raw_adc_hr: Math.round(mean(ir)) }
    } catch (err) {
      console.warn(`[sensors] MAX30102 bus ${MAX30102_BUS} attempt ${attempt}/3:`, err instanceof Error ? err.message : err)
      _pulseInitDone = false
    } finally {
      try { bus?.closeSync() } catch {}
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 300))
  }
  console.error("[sensors] MAX30102: all attempts exhausted on bus", MAX30102_BUS)
  return null
}
