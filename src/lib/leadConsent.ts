export const LEAD_CONSENT_TEXT =
  "I agree to DekhoCampus Privacy Policy and Terms & Conditions. I may receive admission guidance by call, SMS, WhatsApp or email, and I can opt out anytime.";

const LEAD_CONSENT_PREF_KEY = "dc_lead_consent_terms_v1";

export const setLeadConsentPreference = (accepted: boolean) => {
  try {
    localStorage.setItem(LEAD_CONSENT_PREF_KEY, accepted ? "true" : "false");
  } catch {
    // Consent capture must never block lead UX.
  }
};

export const getLeadConsentPreference = () => {
  try {
    const value = localStorage.getItem(LEAD_CONSENT_PREF_KEY);
    if (value === "false") return false;
    if (value === "true") return true;
  } catch {
    // Keep legal default aligned with the visible forms.
  }
  return true;
};

export const leadConsentAccepted = (lead: { consent_terms_accepted?: boolean | null } | null | undefined) =>
  lead?.consent_terms_accepted !== false;

export const leadConsentLabel = (lead: { consent_terms_accepted?: boolean | null } | null | undefined) =>
  leadConsentAccepted(lead) ? "Y" : "N";
