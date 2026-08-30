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

const O2_I2C_BUS = 10
const O2_I2C_ADDR = 0x64
const O2_BASELINE_ADC = 1041.0
const O2_BASELINE_PCT = 20.9

export async function readO2Sensor(): Promise<{ o2_percentage: number; raw_adc: number } | null> {
  const isRpi = process.platform === "linux" && process.arch === "arm64"
  if (!isRpi) return { o2_percentage: 20.9, raw_adc: O2_BASELINE_ADC }

  try {
    const mod = "i2c-bus"
    const { default: i2c } = await import(/* webpackIgnore: true */ mod)
    const bus = i2c.openSync(O2_I2C_BUS)
    try {
      const data = bus.readI2cBlockSync(O2_I2C_ADDR, 0x00, 4, Buffer.alloc(4))
      const raw_adc = (data[0] << 8) | data[1]
      const o2_percentage = (raw_adc / O2_BASELINE_ADC) * O2_BASELINE_PCT
      return { o2_percentage, raw_adc }
    } finally {
      bus.closeSync()
    }
  } catch (err) {
    console.error("[sensors] O2 I2C error:", err)
    return null
  }
}
