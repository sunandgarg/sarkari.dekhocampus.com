import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePublicJobPosting, type PublicJobPostingMetadata } from "@/lib/sarkariJobPosting";

type DraftJobPosting = Omit<Partial<PublicJobPostingMetadata>, "hiringOrganization" | "jobLocations"> & {
  hiringOrganization?: Partial<PublicJobPostingMetadata["hiringOrganization"]>;
  jobLocations?: Array<Partial<PublicJobPostingMetadata["jobLocations"][number]>>;
};

type Props = {
  value: unknown;
  onChange(value: DraftJobPosting | null): void;
};

const EMPLOYMENT_TYPES = [
  ["FULL_TIME", "Full time"],
  ["PART_TIME", "Part time"],
  ["CONTRACTOR", "Contract"],
  ["TEMPORARY", "Temporary"],
  ["INTERN", "Intern"],
  ["OTHER", "Other"],
] as const;

function asDraft(value: unknown): DraftJobPosting {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DraftJobPosting : {};
}

function closingDate(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function closingTime(value: unknown) {
  return typeof value === "string" && value.includes("T") ? value.slice(11, 16) : "";
}

export function SarkariJobPostingEditor({ value, onChange }: Props) {
  const enabled = value !== null && value !== undefined;
  const draft = asDraft(value);
  const organization = draft.hiringOrganization || {};
  const locations = draft.jobLocations?.length ? draft.jobLocations : [{ addressCountry: "IN" as const }];
  const validation = enabled ? validatePublicJobPosting(draft) : undefined;

  const patch = (next: Partial<DraftJobPosting>) => onChange({ ...draft, ...next });
  const patchOrganization = (next: Partial<PublicJobPostingMetadata["hiringOrganization"]>) => {
    patch({ hiringOrganization: { ...organization, ...next } });
  };
  const patchLocation = (index: number, next: Partial<PublicJobPostingMetadata["jobLocations"][number]>) => {
    patch({ jobLocations: locations.map((location, locationIndex) => locationIndex === index ? { ...location, ...next, addressCountry: "IN" } : location) });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <input
          type="checkbox"
          className="mt-1 rounded"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? {
            title: "",
            datePosted: "",
            validThrough: "",
            hiringOrganization: { name: "" },
            jobLocations: [{ addressCountry: "IN", addressRegion: "" }],
            employmentType: ["FULL_TIME"],
          } : null)}
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">Enable verified Google JobPosting data</span>
          <span className="block text-xs text-muted-foreground">Use only for one clearly identified job or cadre. Every fact must match the visible article and official notification.</span>
        </span>
      </label>

      {enabled && <>
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${validation ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
          {validation ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{validation ? "Complete and eligible for JobPosting JSON-LD." : "Incomplete. This article will not emit JobPosting JSON-LD until every required field is valid."}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">Exact job title *</label><Input value={draft.title || ""} onChange={(event) => patch({ title: event.target.value })} placeholder="Anganwadi Worker" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Total openings</label><Input type="number" min={1} value={draft.totalJobOpenings ?? ""} onChange={(event) => patch({ totalJobOpenings: event.target.value ? Number(event.target.value) : undefined })} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Date posted *</label><Input type="date" value={draft.datePosted || ""} onChange={(event) => patch({ datePosted: event.target.value })} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Application closing date *</label><Input type="date" value={closingDate(draft.validThrough)} onChange={(event) => {
            const time = closingTime(draft.validThrough);
            patch({ validThrough: event.target.value ? (time ? `${event.target.value}T${time}:00+05:30` : event.target.value) : "" });
          }} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Exact closing time in India</label><Input type="time" value={closingTime(draft.validThrough)} onChange={(event) => {
            const date = closingDate(draft.validThrough);
            patch({ validThrough: date ? (event.target.value ? `${date}T${event.target.value}:00+05:30` : date) : "" });
          }} /><p className="mt-1 text-[10px] text-muted-foreground">Optional. Leave blank when the authority states only a date.</p></div>
          <div><label className="text-xs font-medium text-muted-foreground">Hiring organization *</label><Input value={organization.name || ""} onChange={(event) => patchOrganization({ name: event.target.value })} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Official organization URL</label><Input type="url" value={organization.sameAs || ""} onChange={(event) => patchOrganization({ sameAs: event.target.value || undefined })} placeholder="https://authority.gov.in/" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Official organization logo URL</label><Input type="url" value={organization.logo || ""} onChange={(event) => patchOrganization({ logo: event.target.value || undefined })} placeholder="Optional HTTPS logo owned by the recruiter" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Notice / advertisement number</label><Input value={draft.identifier?.value || ""} onChange={(event) => patch({ identifier: event.target.value ? { name: organization.name || "Recruiting authority", value: event.target.value } : undefined })} /></div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">Employment type</legend>
          <div className="flex flex-wrap gap-3">
            {EMPLOYMENT_TYPES.map(([key, label]) => <label key={key} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={(draft.employmentType || []).includes(key)} onChange={(event) => {
                const current = draft.employmentType || [];
                patch({ employmentType: event.target.checked ? [...current, key] : current.filter((item) => item !== key) });
              }} />
              {label}
            </label>)}
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-semibold">Physical job location(s) *</legend>
            <Button type="button" size="sm" variant="outline" onClick={() => patch({ jobLocations: [...locations, { addressCountry: "IN" }] })}><Plus className="mr-1 h-4 w-4" />Add location</Button>
          </div>
          {locations.map((location, index) => <div key={index} className="grid grid-cols-1 gap-2 rounded-lg bg-muted/30 p-2 sm:grid-cols-[1fr_1fr_110px_auto]">
            <Input aria-label={`Location ${index + 1} city or district`} value={location.addressLocality || ""} onChange={(event) => patchLocation(index, { addressLocality: event.target.value || undefined })} placeholder="City / district" />
            <Input aria-label={`Location ${index + 1} state`} value={location.addressRegion || ""} onChange={(event) => patchLocation(index, { addressRegion: event.target.value || undefined })} placeholder="State" />
            <Input aria-label={`Location ${index + 1} postal code`} value={location.postalCode || ""} onChange={(event) => patchLocation(index, { postalCode: event.target.value || undefined })} placeholder="PIN" />
            <Button type="button" size="icon" variant="ghost" disabled={locations.length === 1} onClick={() => patch({ jobLocations: locations.filter((_, locationIndex) => locationIndex !== index) })} aria-label={`Remove location ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-border p-3">
          <legend className="text-sm font-semibold">Salary (optional, only when officially stated)</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><label className="text-xs text-muted-foreground">Exact INR amount</label><Input type="number" min={1} value={draft.baseSalary?.value.value ?? ""} onChange={(event) => patch({ baseSalary: event.target.value ? { currency: "INR", value: { value: Number(event.target.value), unitText: draft.baseSalary?.value.unitText || "MONTH" } } : undefined })} /></div>
            <div><label className="text-xs text-muted-foreground">Pay period</label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.baseSalary?.value.unitText || "MONTH"} onChange={(event) => {
              if (!draft.baseSalary) return;
              patch({ baseSalary: { ...draft.baseSalary, value: { ...draft.baseSalary.value, unitText: event.target.value as "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR" } } });
            }}><option value="MONTH">Monthly</option><option value="YEAR">Yearly</option><option value="DAY">Daily</option><option value="HOUR">Hourly</option><option value="WEEK">Weekly</option></select></div>
            <div className="self-end text-xs text-muted-foreground">Currency is fixed to INR. Leave empty when the authority does not state exact pay.</div>
          </div>
        </fieldset>

        <p className="text-xs text-muted-foreground">Direct apply is intentionally omitted because applications are completed on the recruiting authority's website, not on DekhoCampus.</p>
      </>}
    </div>
  );
}
