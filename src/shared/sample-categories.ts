/**
 * Sample company categories - shared between renderer and main
 */

export type SampleCategory = "grocery" | "pharmacy" | "electronics" | "retail";

export const SAMPLE_CATEGORY_OPTIONS: Array<{ value: SampleCategory; label: string }> = [
  { value: "grocery", label: "Grocery Store" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "electronics", label: "Electronics" },
  { value: "retail", label: "General Retail" },
];
