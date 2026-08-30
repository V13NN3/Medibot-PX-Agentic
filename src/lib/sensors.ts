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

const O2_I2C_ADDR = 0x64
const O2_BASELINE_ADC = 1041.0
const O2_BASELINE_PCT = 20.9
const I2C_BUSES_TO_TRY = [10, 1]

let _i2cMod: any = null
async function getI2c() {
  if (!_i2cMod) {
    const mod = "i2c-bus"
    _i2cMod = await import(/* webpackIgnore: true */ mod)
  }
  return _i2cMod.default || _i2cMod
}

function readO2Sync(bus: any, addr: number): { o2_percentage: number; raw_adc: number } | null {
  try {
    const buf = Buffer.alloc(4)
    const result = bus.readI2cBlockSync(addr, 0x00, 4, buf)
    if (!result || !result.buffer) return null
    const raw_adc = (result.buffer[0] << 8) | result.buffer[1]
    const o2_percentage = (raw_adc / O2_BASELINE_ADC) * O2_BASELINE_PCT
    return { o2_percentage, raw_adc }
  } catch {
    try {
      const b0 = bus.readByteSync(addr, 0x00)
      const b1 = bus.readByteSync(addr, 0x01)
      const raw_adc = (b0 << 8) | b1
      const o2_percentage = (raw_adc / O2_BASELINE_ADC) * O2_BASELINE_PCT
      return { o2_percentage, raw_adc }
    } catch {
      return null
    }
  }
}

export async function readO2Sensor(): Promise<{ o2_percentage: number; raw_adc: number } | null> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"
  if (!isRpi) return { o2_percentage: 20.9, raw_adc: O2_BASELINE_ADC }

  const i2c = await getI2c()
  for (const busNum of I2C_BUSES_TO_TRY) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let bus: any = null
      try {
        bus = i2c.openSync(busNum)
        const result = readO2Sync(bus, O2_I2C_ADDR)
        if (result) {
          console.log(`[sensors] O2 read OK on bus ${busNum}: raw=${result.raw_adc} o2=${result.o2_percentage.toFixed(1)}%`)
          return result
        }
      } catch (err) {
        console.warn(`[sensors] O2 bus ${busNum} attempt ${attempt}/3:`, err instanceof Error ? err.message : err)
      } finally {
        try { bus?.closeSync() } catch {}
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 300))
    }
  }
  console.error("[sensors] O2 I2C: all buses and attempts exhausted")
  return null
}

const HR_I2C_ADDR = 0x64

function readHRSync(bus: any, addr: number): { heart_rate: number; raw_adc: number } | null {
  try {
    const buf = Buffer.alloc(4)
    const result = bus.readI2cBlockSync(addr, 0x00, 4, buf)
    if (!result || !result.buffer) return null
    const raw_adc = (result.buffer[2] << 8) | result.buffer[3]
    const heart_rate = raw_adc > 0 ? Math.round((raw_adc / 1024.0) * 180) : 0
    return { heart_rate, raw_adc }
  } catch {
    try {
      const b2 = bus.readByteSync(addr, 0x02)
      const b3 = bus.readByteSync(addr, 0x03)
      const raw_adc = (b2 << 8) | b3
      const heart_rate = raw_adc > 0 ? Math.round((raw_adc / 1024.0) * 180) : 0
      return { heart_rate, raw_adc }
    } catch {
      return null
    }
  }
}

export async function readHeartRateSensor(): Promise<{ heart_rate: number; raw_adc: number } | null> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"
  if (!isRpi) return { heart_rate: 72, raw_adc: 0 }

  const i2c = await getI2c()
  for (const busNum of I2C_BUSES_TO_TRY) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let bus: any = null
      try {
        bus = i2c.openSync(busNum)
        const result = readHRSync(bus, HR_I2C_ADDR)
        if (result) {
          console.log(`[sensors] HR read OK on bus ${busNum}: raw=${result.raw_adc} hr=${result.heart_rate}bpm`)
          return result
        }
      } catch (err) {
        console.warn(`[sensors] HR bus ${busNum} attempt ${attempt}/3:`, err instanceof Error ? err.message : err)
      } finally {
        try { bus?.closeSync() } catch {}
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 300))
    }
  }
  console.error("[sensors] HR I2C: all buses and attempts exhausted")
  return null
}
