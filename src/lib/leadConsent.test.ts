import { beforeEach, describe, expect, it } from "vitest";
import {
  getLeadConsentPreference,
  leadConsentAccepted,
  leadConsentLabel,
  setLeadConsentPreference,
} from "./leadConsent";

describe("lead consent", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to opt-out until a person explicitly accepts", () => {
    expect(getLeadConsentPreference()).toBe(false);
    expect(leadConsentAccepted(undefined)).toBe(false);
    expect(leadConsentAccepted({ consent_terms_accepted: null })).toBe(false);
    expect(leadConsentLabel({ consent_terms_accepted: null })).toBe("N");
  });

  it("persists an explicit choice without interpreting missing data as consent", () => {
    setLeadConsentPreference(true);
    expect(getLeadConsentPreference()).toBe(true);
    expect(leadConsentAccepted({ consent_terms_accepted: true })).toBe(true);

    setLeadConsentPreference(false);
    expect(getLeadConsentPreference()).toBe(false);
  });
});
