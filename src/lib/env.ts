export const env = {
  gemma4: {
    apiKey: process.env.GEMMA4_API_KEY!,
    apiUrl: process.env.GEMMA4_API_URL!,
  },
  medgemma: {
    apiKey: process.env.MEDGEMMA_API_KEY!,
    apiUrl: process.env.MEDGEMMA_API_URL!,
  },
  tts: {
    apiKey: process.env.GOOGLE_TTS_API_KEY!,
    apiUrl: process.env.GOOGLE_TTS_API_URL!,
  },
  grokVoice: {
    apiKey: process.env.GROK_VOICE_API_KEY!,
    model: process.env.GROK_VOICE_MODEL!,
    apiUrl: process.env.GROK_VOICE_API_URL!,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
} as const

export function validateEnv() {
  const missing: string[] = []

  if (!env.gemma4.apiKey) missing.push("GEMMA4_API_KEY")
  if (!env.medgemma.apiKey) missing.push("MEDGEMMA_API_KEY")
  if (!env.tts.apiKey) missing.push("GOOGLE_TTS_API_KEY")
  if (!env.grokVoice.apiKey) missing.push("GROK_VOICE_API_KEY")
  if (!env.database.url) missing.push("DATABASE_URL")

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`)
  }

  return missing
}
