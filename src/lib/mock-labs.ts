import type { AnalysisRow } from "@/types"

export const analysisRows: AnalysisRow[] = [
  { id: "lab-glucose", name: "Glucose", value: 93, unit: "mg/dL", referenceLow: 65, referenceHigh: 99 },
  { id: "lab-bun", name: "BUN", value: 7, unit: "mg/dL", referenceLow: 8, referenceHigh: 20 },
  { id: "lab-bun-cr", name: "BUN / Creatine Ratio", value: 23.5, unit: "", referenceLow: 9, referenceHigh: 23 },
  { id: "lab-creatinine", name: "Creatinine", value: 0.99, unit: "mg/dL", referenceLow: 0.57, referenceHigh: 1.0 },
  { id: "lab-egfr-nonaf", name: "eGFR if non-African Am", value: 1.74, unit: "mL/min/1.73", referenceLow: 59, referenceHigh: 999 },
  { id: "lab-egfr-af", name: "eGFR if African Am", value: 86, unit: "mL/min/1.73", referenceLow: 59, referenceHigh: 999 },
  { id: "lab-sodium", name: "Sodium", value: 141, unit: "mmol/L", referenceLow: 134, referenceHigh: 144 },
  { id: "lab-potassium", name: "Potassium", value: 4.6, unit: "mmol/L", referenceLow: 3.5, referenceHigh: 5.2 },
  { id: "lab-co2", name: "Carbon Dioxide", value: 22, unit: "mmol/L", referenceLow: 20, referenceHigh: 29 },
  { id: "lab-calcium", name: "Calcium", value: 9.6, unit: "mg/dL", referenceLow: 8.7, referenceHigh: 10.2 },
  { id: "lab-protein", name: "Protein, Total", value: 7.4, unit: "g/dL", referenceLow: 6.0, referenceHigh: 8.5 },
  { id: "lab-albumin", name: "Albumin", value: 5.0, unit: "g/dL", referenceLow: 3.5, referenceHigh: 5.2 },
  { id: "lab-globulin", name: "Globulin, Total", value: 2.4, unit: "g/dL", referenceLow: 1.5, referenceHigh: 4.5 },
  { id: "lab-chloride", name: "Chloride", value: 107, unit: "mmol/L", referenceLow: 96, referenceHigh: 106 },
  { id: "lab-ag-ratio", name: "A/G Ratio", value: 2.1, unit: "", referenceLow: 1.2, referenceHigh: 2.0 },
  { id: "lab-bilirubin", name: "Bilirubin, Total", value: 0.6, unit: "mg/dL", referenceLow: 0.2, referenceHigh: 1.2 },
  { id: "lab-alk-phos", name: "Alkaline Phosphatase", value: 76, unit: "U/L", referenceLow: 20, referenceHigh: 117 },
]
