import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdsenseSettings, useAdScripts } from "@/hooks/useAdsense";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

/**
 * Globally injects Google AdSense Auto Ads script + admin-managed custom
 * head/body/footer scripts and custom CSS/JS. Mounted once in App.tsx.
 * Admin routes are excluded.
 */
export function AdsenseLoader() {
  const { pathname } = useLocation();
  const { data: settings } = useAdsenseSettings();
  const { data: scripts } = useAdScripts();
  const preferences = useCookiePreferences();

  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin || !preferences.resolved || !preferences.marketing || !settings || !settings.ads_globally_enabled) return;

    // Defer heavy 3rd-party ad scripts until after LCP so they don't
    // block the main thread on first paint (huge PageSpeed win).
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      runInject();
    }, 5000);

    const created: Node[] = [];
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";

    function runInject() {

    const addScript = (id: string, attrs: Record<string, string>, code?: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      if (code) s.text = code;
      if (nonce) s.nonce = nonce;
      document.head.appendChild(s);
      created.push(s);
    };

    const addRawHtml = (id: string, html: string, target: "head" | "body") => {
      if (!html?.trim() || document.getElementById(id)) return;
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      const dest = target === "head" ? document.head : document.body;
      const marker = target === "head" ? document.createElement("meta") : document.createElement("span");
      marker.id = id;
      if (marker instanceof HTMLSpanElement) marker.hidden = true;
      dest.appendChild(marker);
      created.push(marker);

      const cloneExecutable = (source: Node): Node => {
        if (source instanceof HTMLScriptElement) {
          const active = document.createElement("script");
          Array.from(source.attributes).forEach((attribute) => {
            if (attribute.name.toLowerCase() !== "nonce") active.setAttribute(attribute.name, attribute.value);
          });
          if (nonce) active.nonce = nonce;
          active.dataset.dcExecutable = "true";
          active.textContent = source.textContent;
          return active;
        }
        const clone = source.cloneNode(false);
        source.childNodes.forEach((child) => clone.appendChild(cloneExecutable(child)));
        return clone;
      };

      Array.from(template.content.childNodes).forEach((node) => {
        const active = cloneExecutable(node);
        dest.appendChild(active);
        created.push(active);
      });
    };

    // AdSense library
    if (settings.client_id || settings.publisher_id) {
      const cid = settings.client_id || settings.publisher_id;
      addScript("adsbygoogle-lib", {
        async: "",
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cid}`,
        crossorigin: "anonymous",
      });
    }

    // Auto Ads
    if (settings.auto_ads_enabled && (settings.client_id || settings.publisher_id)) {
      const cid = settings.client_id || settings.publisher_id;
      addScript(
        "adsbygoogle-autoads",
        {},
        `(adsbygoogle = window.adsbygoogle || []).push({ google_ad_client: "${cid}", enable_page_level_ads: true });`,
      );
    }

    // Verification meta
    if (settings.verification_meta && !document.getElementById("adsense-verify-meta")) {
      const meta = document.createElement("meta");
      meta.id = "adsense-verify-meta";
      meta.name = "google-adsense-account";
      meta.content = settings.verification_meta;
      document.head.appendChild(meta);
      created.push(meta);
    }

    // Custom CSS
    if (settings.custom_css?.trim() && !document.getElementById("adsense-custom-css")) {
      const style = document.createElement("style");
      style.id = "adsense-custom-css";
      style.textContent = settings.custom_css;
      document.head.appendChild(style);
      created.push(style);
    }

    // Custom JS
    if (settings.custom_js?.trim()) {
      addScript("adsense-custom-js", {}, settings.custom_js);
    }

    // Raw head/body/footer scripts from settings
    addRawHtml("adsense-head-scripts", settings.head_scripts || "", "head");
    addRawHtml("adsense-body-scripts", settings.body_scripts || "", "body");
    addRawHtml("adsense-footer-scripts", settings.footer_scripts || "", "body");

    // Admin-defined ad_scripts table entries
    const now = Date.now();
    (scripts ?? []).forEach((sc) => {
      if (sc.start_date && new Date(sc.start_date).getTime() > now) return;
      if (sc.end_date && new Date(sc.end_date).getTime() < now) return;
      addRawHtml(`ad-script-${sc.id}`, sc.code, sc.location === "footer" ? "body" : sc.location);
    });

    }

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
      created.forEach((el) => el.parentNode?.removeChild(el));
      document.querySelectorAll(
        'script[src*="googlesyndication.com"],script[src*="googleadservices.com"],iframe[src*="googlesyndication.com"],iframe[src*="doubleclick.net"]',
      ).forEach((node) => node.remove());
    };
  }, [isAdmin, preferences.marketing, preferences.resolved, settings, scripts]);

  return null;
}
