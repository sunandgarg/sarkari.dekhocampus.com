import { Suspense } from "react";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";
import { lazyRetry } from "@/lib/lazyRetry";

const GoogleAd = lazyRetry(
  () => import("@/components/ads/GoogleAd").then((module) => ({ default: module.GoogleAd })),
  "GoogleAd",
);

type SarkariAdSlotProps = {
  placement: "homepage" | "article";
  position: string;
  pageKey: "homepage" | "article";
  category?: string;
  className?: string;
};

/**
 * Keeps the ad implementation chunk and every ad configuration request out of
 * the page until the visitor has explicitly allowed marketing cookies.
 */
export function SarkariAdSlot(props: SarkariAdSlotProps) {
  const preferences = useCookiePreferences();
  if (!preferences.resolved || !preferences.marketing) return null;

  return (
    <Suspense fallback={null}>
      <GoogleAd {...props} country="IN" />
    </Suspense>
  );
}
