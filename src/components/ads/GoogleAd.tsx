import { useEffect, useRef, useState } from "react";
import {
  pickAdUnit,
  useAdUnits,
  useAdsEligibility,
  type AdUnit,
} from "@/hooks/useAdsense";
import { backendClient } from "@/integrations/backend/client";

export interface GoogleAdProps {
  placement: string;
  position?: string;
  pageKey?: string;
  category?: string;
  country?: string;
  className?: string;
  style?: React.CSSProperties;
}

const pageSlotRegistry = new Map<string, Set<symbol>>();

function usePageSlotPermit(active: boolean, rawLimit: number, pageKey: string) {
  const tokenRef = useRef(Symbol("ad-slot"));
  const limit = Math.max(0, Number(rawLimit) || 0);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!active || limit === 0) {
      setClaimed(false);
      return;
    }

    const slots = pageSlotRegistry.get(pageKey) ?? new Set<symbol>();
    if (!pageSlotRegistry.has(pageKey)) pageSlotRegistry.set(pageKey, slots);
    if (slots.size >= limit) {
      setClaimed(false);
      return;
    }

    const token = tokenRef.current;
    slots.add(token);
    setClaimed(true);
    return () => {
      slots.delete(token);
      if (!slots.size) pageSlotRegistry.delete(pageKey);
    };
  }, [active, limit, pageKey]);

  return active && (limit === 0 || claimed);
}

function recordSlotRequest(unit: AdUnit, device: string) {
  try {
    void (backendClient as any)
      .from("ad_analytics_events")
      .insert({
        ad_unit_id: unit.id,
        // This records that our code requested a slot. It deliberately does
        // not claim that Google filled, displayed or received a click on it.
        event_type: "slot_request",
        device,
        page_url: window.location.pathname,
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* telemetry must never block an ad slot */
  }
}

/**
 * Consent-gated manual ad unit. The standard adsbygoogle queue is created even
 * before the deferred library arrives, so a visible slot cannot permanently
 * miss its request while still keeping the third-party script out of the
 * pre-consent and critical-render paths.
 */
export function GoogleAd({
  placement,
  position,
  pageKey,
  category,
  country,
  className = "",
  style,
}: GoogleAdProps) {
  const eligibility = useAdsEligibility(pageKey);
  const { data: units } = useAdUnits({ enabled: eligibility.allowed });
  const ref = useRef<HTMLDivElement>(null);
  const requestedUnitRef = useRef<string | null>(null);

  const unit = pickAdUnit(units, placement, position, {
    viewportWidth: eligibility.viewportWidth,
    device: eligibility.device,
    path: eligibility.path,
    roles: eligibility.roles,
    category,
    country,
  });
  const customHtml = unit?.custom_html?.trim() || "";
  const isCustom = Boolean(unit && unit.ad_type === "custom" && customHtml);
  const isManualAdsense = Boolean(
    unit
      && unit.ad_type !== "custom"
      && unit.ad_slot_id?.trim()
      && eligibility.runtime.clientId,
  );
  const canRenderUnit = Boolean(
    eligibility.allowed
      && unit
      && (isCustom || isManualAdsense),
  );
  // The configured limit is per browser page, not per placement type.
  const registryKey = eligibility.path || pageKey || "/";
  const pageSlotPermitted = usePageSlotPermit(
    canRenderUnit,
    eligibility.runtime.adsPerPageLimit,
    registryKey,
  );

  useEffect(() => {
    if (!pageSlotPermitted || !unit || !ref.current || requestedUnitRef.current === unit.id) return;
    const node = ref.current;
    let observer: IntersectionObserver | undefined;

    const request = () => {
      if (requestedUnitRef.current === unit.id) return;
      try {
        if (!isCustom) {
          const adsWindow = window as Window & { adsbygoogle?: Array<Record<string, unknown>> };
          const queue = (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []);
          if (typeof queue.push !== "function") return;
          queue.push({});
        }
        requestedUnitRef.current = unit.id;
        recordSlotRequest(unit, eligibility.device);
      } catch {
        // Keep the slot eligible for a later React retry if the publisher
        // library temporarily replaces its queue with an unusable value.
      }
    };

    if (eligibility.runtime.lazyLoadEnabled && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          request();
          observer?.disconnect();
        }
      }, { rootMargin: "200px" });
      observer.observe(node);
    } else {
      request();
    }

    return () => {
      observer?.disconnect();
      if (requestedUnitRef.current === unit.id) requestedUnitRef.current = null;
    };
  }, [eligibility.device, eligibility.runtime.lazyLoadEnabled, isCustom, pageSlotPermitted, unit]);

  if (!pageSlotPermitted || !unit) return null;

  const client = eligibility.runtime.clientId;
  const isLargeRectangle = position === "bottom"
    || position === "after-important-links"
    || position === "before-related";
  const minHeight = unit.min_height
    || (unit.ad_type === "sticky" ? 90 : isLargeRectangle ? 280 : 250);

  return (
    <div
      ref={ref}
      role="complementary"
      aria-label="Advertisement"
      className={`google-ad-slot ${className}`}
      data-ad-placement={placement}
      data-ad-position={position || ""}
      style={{ minHeight, display: "block", overflow: "hidden", ...style }}
    >
      <span className="sarkari-ad-label">Advertisement</span>
      {isCustom ? (
        <div dangerouslySetInnerHTML={{ __html: customHtml }} />
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client || undefined}
          data-ad-slot={unit.ad_slot_id}
          data-ad-format={unit.ad_format || "auto"}
          data-full-width-responsive={unit.full_width_responsive ? "true" : "false"}
        />
      )}
    </div>
  );
}

export function resetAdPageLimitRegistryForTests() {
  pageSlotRegistry.clear();
}
