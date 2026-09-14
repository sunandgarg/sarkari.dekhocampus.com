import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { backendClient } from "@/integrations/backend/client";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

export const PUBLIC_BROWSER_INTEGRATION_KEYS = [
  "ga4_measurement_id",
  "gtm_container_id",
  "gsc_verification",
  "ms_clarity_id",
  "facebook_pixel_id",
  "content_copy_protection",
  "google_ads_id",
  "google_ads_conversion_label",
  "bing_verification",
  "bing_uet_tag",
  "linkedin_partner_id",
  "hotjar_id",
  "plausible_domain",
] as const;

const VERIFIED_BROWSER_DEFAULTS = {
  ga4_measurement_id: "G-Y8E5HHTXLX",
  gtm_container_id: "GTM-5PF56SJF",
  gsc_verification: "3DDCGwQFHjNYmfDh2mU98784SkP9Qnoe5biD8wpA0Zk",
  ms_clarity_id: "y9bvg8jdmr",
  facebook_pixel_id: "28062999866677764",
} as const;

function normalizePublicIntegrationValue(key: string, rawValue: unknown) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  const matches = (pattern: RegExp) => pattern.test(value) ? value : "";
  switch (key) {
    case "ga4_measurement_id": return matches(/^G-[A-Z0-9]{4,20}$/i);
    case "gtm_container_id": return matches(/^GTM-[A-Z0-9]{4,20}$/i);
    case "gsc_verification": return matches(/^[A-Z0-9_-]{20,128}$/i);
    case "ms_clarity_id": return matches(/^[A-Z0-9]{5,24}$/i);
    case "facebook_pixel_id": return matches(/^\d{5,30}$/);
    case "google_ads_id": return matches(/^AW-\d{5,20}$/i);
    case "google_ads_conversion_label": return matches(/^[A-Z0-9_-]{1,100}$/i);
    case "bing_verification": return matches(/^[A-Z0-9_-]{8,128}$/i);
    case "bing_uet_tag":
    case "linkedin_partner_id":
    case "hotjar_id": return matches(/^\d{3,24}$/);
    case "plausible_domain": return matches(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i);
    case "content_copy_protection": return value === "copy_blocked" ? value : "";
    default: return "";
  }
}

export function SiteIntegrations() {
  const location = useLocation();
  const preferences = useCookiePreferences();
  const lastBufferedRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!preferences.resolved) return;
    const analyticsWindow = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; clarity?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
    const dataLayer = (analyticsWindow.dataLayer = analyticsWindow.dataLayer || []);
    const consentState = {
      analytics_storage: preferences.analytics ? "granted" : "denied",
      ad_storage: preferences.marketing ? "granted" : "denied",
      ad_user_data: preferences.marketing ? "granted" : "denied",
      ad_personalization: preferences.marketing ? "granted" : "denied",
    };
    analyticsWindow.gtag?.("consent", "update", consentState);
    analyticsWindow.clarity?.("consentv2", {
      analytics_Storage: preferences.analytics ? "granted" : "denied",
      ad_Storage: preferences.marketing ? "granted" : "denied",
    });
    analyticsWindow.fbq?.("consent", preferences.marketing ? "grant" : "revoke");
    dataLayer.push({
      event: "dc_consent_update",
      ...consentState,
    });
  }, [preferences.analytics, preferences.marketing, preferences.resolved]);

  useEffect(() => {
    if (!preferences.resolved || (!preferences.analytics && !preferences.marketing)) return;
    const routeIdentity = `${location.key}:${location.pathname}${location.search}`;
    if (lastBufferedRouteRef.current === routeIdentity) return;
    lastBufferedRouteRef.current = routeIdentity;

    const analyticsWindow = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
    const dataLayer = (analyticsWindow.dataLayer = analyticsWindow.dataLayer || []);
    // `virtual_page_view` is the single provider-neutral SPA route contract.
    // GTM consumes the buffer when it owns providers; direct integrations also
    // receive their native calls, but only after their own loader marker exists.
    dataLayer.push({
      event: "virtual_page_view",
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}`,
      page_title: document.title,
    });
    if (preferences.analytics && document.getElementById("ga4-lib")) {
      analyticsWindow.gtag?.("event", "page_view", {
        page_location: window.location.href,
        page_path: `${location.pathname}${location.search}`,
        page_title: document.title,
      });
    }
    if (preferences.marketing && document.getElementById("fbq-init")) {
      analyticsWindow.fbq?.("track", "PageView");
    }
  }, [location.key, location.pathname, location.search, preferences.analytics, preferences.marketing, preferences.resolved]);

  useEffect(() => {
    if (!preferences.resolved) return;
    let cancelled = false;
    const cleanupFns: Array<() => void> = [];
    const createdNodes: Node[] = [];
    (async () => {
      // These identifiers are public browser configuration, not credentials.
      // Keep the verified production integrations available during a temporary
      // configuration-API outage; enabled database values still take priority.
      const map: Record<string, string> = { ...VERIFIED_BROWSER_DEFAULTS };
      const defaultedKeys = new Set(Object.keys(map));
      const explicitlyBlockedKeys = new Set<string>();
      try {
        const result = await backendClient
          .from("site_integrations")
          .select("key,value,enabled")
          .in("key", [...PUBLIC_BROWSER_INTEGRATION_KEYS]);
        if (result.error) throw result.error;
        const data = result.data as Array<{ key: string; value: string; enabled: boolean }> | null;
        for (const row of data ?? []) {
          if (!(PUBLIC_BROWSER_INTEGRATION_KEYS as readonly string[]).includes(row.key)) continue;
          const value = normalizePublicIntegrationValue(row.key, row.value);
          if (row.enabled && value) map[row.key] = value;
          else {
            explicitlyBlockedKeys.add(row.key);
            if (defaultedKeys.has(row.key)) delete map[row.key];
          }
        }
      } catch (error) {
        console.warn("[SiteIntegrations] using verified public defaults because configuration is unavailable", error instanceof Error ? error.message : "unknown error");
      }
      if (cancelled) return;

      if (preferences.analytics || preferences.marketing) {
        // Analytics pixels are non-critical. Start them after interaction, with
        // a fallback for visitors who stay on a static page.
        await new Promise<void>((resolve) => {
          let settled = false;
          const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll"];
          const finish = () => {
            if (settled) return;
            settled = true;
            events.forEach((event) => window.removeEventListener(event, finish));
            window.clearTimeout(timer);
            resolve();
          };
          events.forEach((event) => window.addEventListener(event, finish, { once: true, passive: true }));
          const timer = window.setTimeout(finish, 15_000);
          cleanupFns.push(() => {
            events.forEach((event) => window.removeEventListener(event, finish));
            window.clearTimeout(timer);
            resolve();
          });
        });
      }
      if (cancelled) return;

      const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";
      const append = (parent: HTMLElement, node: Node) => {
        parent.appendChild(node);
        createdNodes.push(node);
      };
      const inject = (id: string, html: string) => {
        if (document.getElementById(id)) return;
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        tpl.content.querySelectorAll("script").forEach((node) => { if (nonce) node.nonce = nonce; });
        Array.from(tpl.content.childNodes).forEach((node) => append(document.head, node));
      };
      const script = (id: string, src: string, async = true) => {
        if (document.getElementById(id)) return;
        const s = document.createElement("script");
        s.id = id; s.src = src; s.async = async;
        if (nonce) s.nonce = nonce;
        append(document.head, s);
      };
      const inline = (id: string, code: string) => {
        if (document.getElementById(id)) return;
        const s = document.createElement("script");
        s.id = id; s.text = code;
        if (nonce) s.nonce = nonce;
        append(document.head, s);
      };
      const isAdmin = window.location.pathname.startsWith("/admin");
      const copyBlocked = !isAdmin && map.content_copy_protection === "copy_blocked";
      document.body.classList.toggle("content-copy-protected", copyBlocked);
      if (copyBlocked && !document.getElementById("content-copy-protection-style")) {
        const style = document.createElement("style");
        style.id = "content-copy-protection-style";
        style.textContent = `body.content-copy-protected, body.content-copy-protected main, body.content-copy-protected article, body.content-copy-protected section { -webkit-user-select: none; user-select: none; } body.content-copy-protected input, body.content-copy-protected textarea, body.content-copy-protected select, body.content-copy-protected [contenteditable="true"] { -webkit-user-select: text; user-select: text; }`;
        append(document.head, style);
      }
      if (copyBlocked) {
        const isEditable = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest("input, textarea, select, [contenteditable='true'], [data-copy-allowed]");
        const block = (event: Event) => { if (!isEditable(event.target)) event.preventDefault(); };
        document.addEventListener("copy", block);
        document.addEventListener("cut", block);
        document.addEventListener("contextmenu", block);
        document.addEventListener("selectstart", block);
        cleanupFns.push(() => {
          document.removeEventListener("copy", block);
          document.removeEventListener("cut", block);
          document.removeEventListener("contextmenu", block);
          document.removeEventListener("selectstart", block);
        });
      }

      const gtmContainerId = map.gtm_container_id || "";
      const bundledProviderKeys = ["ga4_measurement_id", "ms_clarity_id", "facebook_pixel_id"];
      const bundledProviderDisabled = bundledProviderKeys.some((key) => explicitlyBlockedKeys.has(key));
      const verifiedBundle = gtmContainerId === VERIFIED_BROWSER_DEFAULTS.gtm_container_id
        && map.ga4_measurement_id === VERIFIED_BROWSER_DEFAULTS.ga4_measurement_id
        && map.ms_clarity_id === VERIFIED_BROWSER_DEFAULTS.ms_clarity_id
        && map.facebook_pixel_id === VERIFIED_BROWSER_DEFAULTS.facebook_pixel_id;
      // The verified default container has a tested three-provider contract.
      // A different, explicitly configured GTM container is authoritative for
      // its own tags unless an administrator also disables a bundled provider.
      const customBundle = Boolean(
        gtmContainerId
          && gtmContainerId !== VERIFIED_BROWSER_DEFAULTS.gtm_container_id
          && !bundledProviderDisabled,
      );
      const hasGtm = Boolean(
        preferences.analytics
          && preferences.marketing
          && !bundledProviderDisabled
          && (verifiedBundle || customBundle),
      );
      // GA4 is intentionally managed by GTM. Only fall back to direct gtag
      // when an installation explicitly removes the GTM container.
      if (preferences.analytics && map.ga4_measurement_id && !hasGtm) {
        script("ga4-lib", `https://www.googletagmanager.com/gtag/js?id=${map.ga4_measurement_id}`);
        inline("ga4-init", `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${map.ga4_measurement_id}',{send_page_view:false});gtag('event','page_view',{page_location:window.location.href,page_path:window.location.pathname+window.location.search,page_title:document.title});`);
      }
      // Google Ads (gtag) - loads gtag.js and registers the AW-XXXX conversion id.
      // Fire conversions anywhere via:  window.fireGoogleAdsConversion()  (uses stored label).
      if (preferences.marketing && map.google_ads_id) {
        if (!preferences.analytics || !map.ga4_measurement_id) {
          script("gads-lib", `https://www.googletagmanager.com/gtag/js?id=${map.google_ads_id}`);
          inline("gads-init-base", `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`);
        }
        inline("gads-config", `gtag('config','${map.google_ads_id}');`);
        const label = map.google_ads_conversion_label || "";
        inline("gads-helper", `window.fireGoogleAdsConversion=function(extra){try{var l='${label}';if(!l)return;window.gtag&&window.gtag('event','conversion',Object.assign({send_to:'${map.google_ads_id}/'+l},extra||{}));}catch(e){}};`);
        cleanupFns.push(() => {
          const integrationWindow = window as Window & { fireGoogleAdsConversion?: unknown };
          try { delete integrationWindow.fireGoogleAdsConversion; } catch { integrationWindow.fireGoogleAdsConversion = undefined; }
        });
      }
      // GTM
      if (hasGtm) {
        inline("gtm-init", `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmContainerId}');`);
      }
      // GSC
      const gscMeta = document.querySelector<HTMLMetaElement>('meta[name="google-site-verification"]');
      if (map.gsc_verification) {
        if (gscMeta) gscMeta.content = map.gsc_verification;
        else inject("gsc-meta", `<meta id="gsc-meta" name="google-site-verification" content="${map.gsc_verification}" />`);
      } else {
        gscMeta?.remove();
      }
      // Bing
      if (map.bing_verification) inject("bing-meta", `<meta id="bing-meta" name="msvalidate.01" content="${map.bing_verification}" />`);
      // Microsoft Clarity
      if (preferences.analytics && map.ms_clarity_id && !hasGtm) {
        inline("clarity-init", `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};c[a]("consentv2",{analytics_Storage:"granted",ad_Storage:"${preferences.marketing ? "granted" : "denied"}"});t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${map.ms_clarity_id}");`);
      }
      // Bing UET
      if (preferences.marketing && map.bing_uet_tag) {
        inline("uet-init", `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${map.bing_uet_tag}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`);
      }
      // LinkedIn
      if (preferences.marketing && map.linkedin_partner_id) {
        inline("li-init", `_linkedin_partner_id="${map.linkedin_partner_id}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);`);
      }
      // Meta Pixel is managed by GTM when a container is enabled. Initializing
      // it here as well records duplicate PageView events.
      if (preferences.marketing && map.facebook_pixel_id && !hasGtm) {
        inline("fbq-init", `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','grant');fbq('init','${map.facebook_pixel_id}');fbq('track','PageView');`);
      }
      // Hotjar
      if (preferences.analytics && map.hotjar_id) {
        inline("hj-init", `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${map.hotjar_id},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`);
      }
      // Plausible
      if (preferences.analytics && map.plausible_domain) {
        const s = document.createElement("script");
        s.id = "plausible"; s.defer = true; s.src = "https://plausible.io/js/script.js";
        s.setAttribute("data-domain", map.plausible_domain);
        if (nonce) s.nonce = nonce;
        append(document.head, s);
      }
    })();
    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      createdNodes.forEach((node) => node.parentNode?.removeChild(node));
      document.querySelectorAll<HTMLScriptElement>(
        'script[src*="googletagmanager.com/gtm.js"],script[src*="clarity.ms/tag/"],script[src*="bat.bing.com/bat.js"],script[src*="connect.facebook.net/"],script[src*="static.hotjar.com/"],script[src*="snap.licdn.com/"]',
      ).forEach((node) => node.remove());
      document.body.classList.remove("content-copy-protected");
    };
  }, [preferences.analytics, preferences.marketing, preferences.resolved]);
  return null;
}
