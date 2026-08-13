"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"

interface PatientForm {
  name?: string
  dob?: string
  sex?: string
  address?: string
  contact_number?: string
}

const FIELDS: Array<{ key: keyof PatientForm; label: string; fmt: (v: string) => string }> = [
  { key: "name", label: "Name", fmt: (v) => v },
  { key: "dob", label: "Date of Birth", fmt: (v) => v },
  { key: "sex", label: "Sex", fmt: (v) => v },
  { key: "address", label: "Address", fmt: (v) => v || "—" },
  { key: "contact_number", label: "Contact", fmt: (v) => v || "—" },
]

export function NewPatientFill() {
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState<PatientForm>({})
  const [filledCount, setFilledCount] = useState(0)
  const [done, setDone] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const onFill = (e: Event) => {
      const detail = (e as CustomEvent).detail as { form?: PatientForm } | undefined
      const f = detail?.form || {}
      setForm(f)
      setFilledCount(0)
      setDone(false)
      setVisible(true)

      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []

      FIELDS.forEach((field, i) => {
        const value = f[field.key]
        if (!value) return
        timers.current.push(
          setTimeout(() => setFilledCount(i + 1), 600 * (i + 1)),
        )
      })

      const totalFilled = FIELDS.filter((fld) => f[fld.key]).length
      timers.current.push(
        setTimeout(() => {
          setDone(true)
        }, 600 * totalFilled + 400),
      )
      timers.current.push(
        setTimeout(() => {
          setVisible(false)
        }, 600 * totalFilled + 2400),
      )
    }

    window.addEventListener("voice-create-patient", onFill)
    return () => {
      window.removeEventListener("voice-create-patient", onFill)
      timers.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <Card padding="lg" className="w-full max-w-md flex flex-col gap-4">
        <h3 className="text-lg font-bold text-foreground">Registering New Patient</h3>
        <p className="text-sm text-gray-500">The AI assistant is filling out the form for you...</p>

        <div className="flex flex-col gap-2">
          {FIELDS.map((field, i) => {
            const filled = i < filledCount
            const active = i === filledCount && !done
            const value = form[field.key]
            if (!value && i >= filledCount) {
              return (
                <div key={field.key} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${active ? "border-primary bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{field.label}</span>
                  <span className="text-xs text-gray-400">filling...</span>
                </div>
              )
            }
            return (
              <div key={field.key} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-sm ${active ? "border-primary bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{field.label}</span>
                {filled || value ? (
                  <span className="text-foreground font-medium tabular-nums">{field.fmt(value || "")}</span>
                ) : (
                  <span className="text-xs text-gray-400">filling...</span>
                )}
              </div>
            )
          })}
        </div>

        {done && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-3xl text-success">&#10003;</span>
            <p className="text-lg font-semibold text-success">Registered!</p>
          </div>
        )}
      </Card>
    </div>
  )
}
