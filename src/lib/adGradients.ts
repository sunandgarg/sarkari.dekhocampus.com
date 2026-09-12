export const AD_GRADIENT_OPTIONS = [
  { value: "from-violet-600 to-purple-600", label: "Purple" },
  { value: "from-teal-500 to-emerald-500", label: "Teal" },
  { value: "from-amber-500 to-orange-500", label: "Orange" },
  { value: "from-rose-500 to-pink-500", label: "Pink" },
  { value: "from-blue-500 to-indigo-500", label: "Blue" },
  { value: "from-green-500 to-teal-500", label: "Green" },
  { value: "from-red-500 to-rose-500", label: "Red" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan" },
  { value: "from-slate-700 to-slate-900", label: "Dark" },
  { value: "from-pink-500 to-violet-500", label: "Magenta" },
] as const;

export const AD_GRADIENT_CLASSES = AD_GRADIENT_OPTIONS.flatMap(({ value }) => value.split(" "));
export const DEFAULT_AD_GRADIENT = AD_GRADIENT_OPTIONS[0].value;

const allowedGradients = new Set<string>(AD_GRADIENT_OPTIONS.map(({ value }) => value));

export function normalizeAdGradient(value: unknown) {
  const candidate = String(value || "").trim().replace(/\s+/g, " ");
  return allowedGradients.has(candidate) ? candidate : DEFAULT_AD_GRADIENT;
}
