export const SARKARI_CATEGORIES = [
  "Latest Jobs",
  "Results",
  "Admit Card",
  "Answer Key",
  "Admissions",
  "Syllabus",
  "Scholarships",
] as const;

export type SarkariCategory = (typeof SARKARI_CATEGORIES)[number];

export function normalizeSarkariCategory(value: string | null | undefined): SarkariCategory {
  const category = (value || "").toLowerCase();
  if (category.includes("result")) return "Results";
  if (category.includes("admit") || category.includes("hall ticket")) return "Admit Card";
  if (category.includes("answer")) return "Answer Key";
  if (category.includes("admission") || category.includes("counselling")) return "Admissions";
  if (category.includes("syllabus") || category.includes("pattern")) return "Syllabus";
  if (category.includes("scholar")) return "Scholarships";
  return "Latest Jobs";
}

export function isSarkariCategory(value: string): value is SarkariCategory {
  return (SARKARI_CATEGORIES as readonly string[]).includes(value);
}
