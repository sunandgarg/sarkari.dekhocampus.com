import { Checkbox } from "@/components/ui/checkbox";
export { LEAD_CONSENT_TEXT } from "@/lib/leadConsent";

interface LeadConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  textClassName?: string;
  compact?: boolean;
  dark?: boolean;
  purposeText?: string;
  invalid?: boolean;
}

const PRIVACY_POLICY_URL = "https://dekhocampus.com/legal/privacy-policy";
const TERMS_URL = "https://dekhocampus.com/legal/terms-of-service";

export function LeadConsentCheckbox({
  checked,
  onCheckedChange,
  className = "",
  textClassName = "",
  compact = false,
  dark = false,
  purposeText = "admission guidance",
  invalid = false,
}: LeadConsentCheckboxProps) {
  const linkClass = dark ? "underline text-white" : "underline text-primary";

  return (
    <label className={`flex cursor-pointer items-start gap-2 ${className}`}>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="relative mt-0.5 h-4 w-4 shrink-0 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
        aria-label="Privacy and terms consent"
        aria-required="true"
        aria-invalid={invalid}
      />
      <span className={`${compact ? "text-[10px] leading-4" : "text-[11px] leading-tight"} ${dark ? "text-white/75" : "text-muted-foreground"} ${textClassName}`}>
        I agree to DekhoCampus{" "}
        <a href={PRIVACY_POLICY_URL} className={`inline-flex min-h-11 items-center ${linkClass}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href={TERMS_URL} className={`inline-flex min-h-11 items-center ${linkClass}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          Terms & Conditions
        </a>
        . I may receive {purposeText} by call, SMS, WhatsApp or email, and I can opt out anytime.
      </span>
    </label>
  );
}
