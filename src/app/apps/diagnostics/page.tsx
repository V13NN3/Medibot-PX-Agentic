"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { Card } from "@/components/ui/card"

const QUICK_SYMPTOMS = [
  "Headache",
  "Fever",
  "Cough",
  "Sore throat",
  "Stomach pain",
  "Dizziness",
  "Fatigue",
  "Body aches",
  "Nausea",
]

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  disclaimer?: boolean
}

function DiagnosticsInner() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [age, setAge] = useState("")
  const [sex, setSex] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    setInput("")
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const res = await fetch("/api/symptom-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          age: age || undefined,
          sex: sex || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, disclaimer: true }])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 gap-2 max-w-xl mx-auto w-full overflow-hidden">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Symptom Explorer</h2>
        <p className="text-xs text-gray-500">Talk to the assistant about your symptoms</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <p>
          <strong>Educational use only while you wait for your doctor.</strong> This is not a diagnosis.
          Always consult a qualified healthcare professional.
        </p>
      </div>

      <Card padding="none" className="flex flex-col gap-2 p-3">
        <div className="flex gap-2">
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age (optional)"
            min={0}
            max={130}
            className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          />
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">Sex (optional)</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_SYMPTOMS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card padding="md" className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto kiosk-scroll">
        {messages.length === 0 && !loading ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Describe your symptom below or tap a chip to get started.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-foreground rounded-bl-sm"
              }`}>
                {m.content}
              </div>
              {m.disclaimer && (
                <p className="text-[10px] text-gray-400 mt-1 max-w-[85%]">
                  I&apos;m an AI assistant, not a doctor. This information is for reference only.
                  Please consult a qualified healthcare professional for proper diagnosis and treatment.
                </p>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 text-foreground">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Describe your symptom..."
          maxLength={300}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="button" onClick={() => send(input)} disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-300">
          Send
        </button>
      </div>
    </div>
  )
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <DiagnosticsInner />
    </Suspense>
  )
}
