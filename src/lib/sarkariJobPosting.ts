import {
  containsBlockedPublicSource,
  stripVisibleArticleSources,
  stripVisibleSourceBrands,
} from "./articleContentSanitizer";

const EMPLOYMENT_TYPES = new Set([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "TEMPORARY",
  "INTERN",
  "VOLUNTEER",
  "PER_DIEM",
  "OTHER",
]);
const SALARY_UNITS = new Set(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]);

export type PublicJobLocation = {
  addressCountry: "IN";
  addressRegion?: string;
  addressLocality?: string;
  streetAddress?: string;
  postalCode?: string;
};

export type PublicJobPostingMetadata = {
  title: string;
  datePosted: string;
  validThrough: string;
  hiringOrganization: {
    name: string;
    sameAs?: string;
    logo?: string;
  };
  jobLocations: PublicJobLocation[];
  employmentType?: string[];
  identifier?: { name: string; value: string };
  directApply?: true;
  totalJobOpenings?: number;
  baseSalary?: {
    currency: "INR";
    value: {
      unitText: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
      value?: number;
      minValue?: number;
      maxValue?: number;
    };
  };
};

type JobPostingSchemaInput = {
  canonical: string;
  description: string;
  metadata?: PublicJobPostingMetadata;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number, required = false) {
  if ((value === null || value === undefined || value === "") && !required) return "";
  if (typeof value !== "string" || /[<>]/.test(value)) return undefined;
  const clean = stripVisibleSourceBrands(value).replace(/\s+/g, " ").trim();
  if ((required && !clean) || clean.length > maximum || containsBlockedPublicSource(value)) return undefined;
  return clean;
}

function optionalHttpsUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 2_048 || containsBlockedPublicSource(value)) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isZonedDateTime(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function positiveFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function validateSalary(value: unknown): PublicJobPostingMetadata["baseSalary"] | undefined {
  if (!isRecord(value) || value.currency !== "INR" || !isRecord(value.value)) return undefined;
  const unitText = value.value.unitText;
  if (typeof unitText !== "string" || !SALARY_UNITS.has(unitText)) return undefined;
  const exact = positiveFiniteNumber(value.value.value);
  const minimum = positiveFiniteNumber(value.value.minValue);
  const maximum = positiveFiniteNumber(value.value.maxValue);
  const normalizedUnit = unitText as "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
  if (exact === undefined && (minimum === undefined || maximum === undefined || minimum > maximum)) return undefined;
  if (exact !== undefined && (minimum !== undefined || maximum !== undefined)) return undefined;
  return {
    currency: "INR",
    value: exact !== undefined
      ? { unitText: normalizedUnit, value: exact }
      : {
          unitText: normalizedUnit,
          minValue: minimum,
          maxValue: maximum,
        },
  };
}

/**
 * Validates editor-supplied job facts without deriving or guessing facts from
 * prose. Invalid metadata is ignored so an article never emits deceptive
 * Google job structured data.
 */
export function validatePublicJobPosting(value: unknown): PublicJobPostingMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const title = boundedText(value.title, 150, true);
  if (!title || !isDateOnly(value.datePosted) || (!isDateOnly(value.validThrough) && !isZonedDateTime(value.validThrough))) return undefined;
  const closingInstant = value.validThrough.length === 10 ? `${value.validThrough}T23:59:59+05:30` : value.validThrough;
  if (Date.parse(closingInstant) <= Date.parse(`${value.datePosted}T00:00:00Z`)) return undefined;

  if (!isRecord(value.hiringOrganization)) return undefined;
  const organizationName = boundedText(value.hiringOrganization.name, 200, true);
  const organizationUrl = optionalHttpsUrl(value.hiringOrganization.sameAs);
  const organizationLogo = optionalHttpsUrl(value.hiringOrganization.logo);
  if (!organizationName || organizationUrl === undefined || organizationLogo === undefined) return undefined;

  if (!Array.isArray(value.jobLocations) || !value.jobLocations.length || value.jobLocations.length > 100) return undefined;
  const jobLocations: PublicJobLocation[] = [];
  for (const rawLocation of value.jobLocations) {
    if (!isRecord(rawLocation) || rawLocation.addressCountry !== "IN") return undefined;
    const addressRegion = boundedText(rawLocation.addressRegion, 160);
    const addressLocality = boundedText(rawLocation.addressLocality, 160);
    const streetAddress = boundedText(rawLocation.streetAddress, 300);
    const postalCode = boundedText(rawLocation.postalCode, 16);
    if ([addressRegion, addressLocality, streetAddress, postalCode].includes(undefined) || (!addressRegion && !addressLocality)) return undefined;
    jobLocations.push({
      addressCountry: "IN",
      ...(addressRegion ? { addressRegion } : {}),
      ...(addressLocality ? { addressLocality } : {}),
      ...(streetAddress ? { streetAddress } : {}),
      ...(postalCode ? { postalCode } : {}),
    });
  }

  let employmentType: string[] | undefined;
  if (value.employmentType !== null && value.employmentType !== undefined) {
    if (!Array.isArray(value.employmentType) || !value.employmentType.length || value.employmentType.length > EMPLOYMENT_TYPES.size) return undefined;
    if (value.employmentType.some((item) => typeof item !== "string" || !EMPLOYMENT_TYPES.has(item))) return undefined;
    employmentType = [...new Set(value.employmentType as string[])];
  }

  let identifier: PublicJobPostingMetadata["identifier"];
  if (value.identifier !== null && value.identifier !== undefined) {
    if (!isRecord(value.identifier)) return undefined;
    const name = boundedText(value.identifier.name, 200, true);
    const identifierValue = boundedText(value.identifier.value, 200, true);
    if (!name || !identifierValue) return undefined;
    identifier = { name, value: identifierValue };
  }

  let totalJobOpenings: number | undefined;
  if (value.totalJobOpenings !== null && value.totalJobOpenings !== undefined) {
    if (!Number.isInteger(value.totalJobOpenings) || Number(value.totalJobOpenings) < 1 || Number(value.totalJobOpenings) > 1_000_000) return undefined;
    totalJobOpenings = Number(value.totalJobOpenings);
  }

  let baseSalary: PublicJobPostingMetadata["baseSalary"];
  if (value.baseSalary !== null && value.baseSalary !== undefined) {
    baseSalary = validateSalary(value.baseSalary);
    if (!baseSalary) return undefined;
  }

  if (value.directApply !== undefined && value.directApply !== true) return undefined;

  return {
    title,
    datePosted: value.datePosted,
    validThrough: value.validThrough,
    hiringOrganization: {
      name: organizationName,
      ...(organizationUrl ? { sameAs: organizationUrl } : {}),
      ...(organizationLogo ? { logo: organizationLogo } : {}),
    },
    jobLocations,
    ...(employmentType ? { employmentType } : {}),
    ...(identifier ? { identifier } : {}),
    ...(value.directApply === true ? { directApply: true as const } : {}),
    ...(totalJobOpenings ? { totalJobOpenings } : {}),
    ...(baseSalary ? { baseSalary } : {}),
  };
}

function safeDescriptionHtml(value: string) {
  return stripVisibleArticleSources(value)
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .trim();
}

export function buildJobPostingSchema({ canonical, description, metadata }: JobPostingSchemaInput) {
  let canonicalUrl: URL;
  try { canonicalUrl = new URL(canonical); } catch { return undefined; }
  if (!metadata || canonicalUrl.protocol !== "https:" || canonicalUrl.hostname !== "sarkari.dekhocampus.com" || !canonicalUrl.pathname.startsWith("/news/")) return undefined;
  const safeDescription = safeDescriptionHtml(description);
  const visibleLength = safeDescription.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  if (visibleLength < 100) return undefined;

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${canonical}#job-posting`,
    title: metadata.title,
    description: safeDescription,
    datePosted: metadata.datePosted,
    validThrough: metadata.validThrough,
    employmentType: metadata.employmentType?.length === 1 ? metadata.employmentType[0] : metadata.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: metadata.hiringOrganization.name,
      sameAs: metadata.hiringOrganization.sameAs,
      logo: metadata.hiringOrganization.logo,
    },
    jobLocation: metadata.jobLocations.map((location) => ({
      "@type": "Place",
      address: { "@type": "PostalAddress", ...location },
    })),
    identifier: metadata.identifier
      ? { "@type": "PropertyValue", name: metadata.identifier.name, value: metadata.identifier.value }
      : undefined,
    directApply: metadata.directApply,
    totalJobOpenings: metadata.totalJobOpenings,
    baseSalary: metadata.baseSalary
      ? {
          "@type": "MonetaryAmount",
          currency: metadata.baseSalary.currency,
          value: { "@type": "QuantitativeValue", ...metadata.baseSalary.value },
        }
      : undefined,
    url: canonical,
  };
}
