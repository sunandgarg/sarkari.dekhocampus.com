import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { extname, resolve } from "path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function collectPublicText(directory: string): string[] {
  const absolute = resolve(root, directory);
  return readdirSync(absolute).flatMap((name) => {
    const path = resolve(absolute, name);
    if (statSync(path).isDirectory()) return collectPublicText(path);
    return [".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"]
      .includes(extname(path)) ? [readFileSync(path, "utf8")] : [];
  });
}

describe("Sarkari public integrations and secret boundary", () => {
  const index = read("index.html");
  const integrations = read("src/components/SiteIntegrations.tsx");
  const headers = read("public/_headers");

  it("ships the required public verification and measurement identifiers", () => {
    expect(index.match(/name="google-site-verification"/g)).toHaveLength(1);
    expect(index).toContain("3DDCGwQFHjNYmfDh2mU98784SkP9Qnoe5biD8wpA0Zk");
    expect(index).toContain('content="ca-pub-4858806955717066"');
    expect(integrations).toContain("G-Y8E5HHTXLX");
    expect(integrations).toContain("y9bvg8jdmr");
    expect(integrations).toContain("28062999866677764");
  });

  it("sets denied Consent Mode before the application and makes no ad preconnect", () => {
    const consentIndex = index.indexOf("data-dc-consent-default");
    const applicationIndex = index.indexOf('<script type="module"');
    expect(consentIndex).toBeGreaterThan(0);
    expect(consentIndex).toBeLessThan(applicationIndex);
    for (const purpose of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      expect(index).toMatch(new RegExp(`${purpose}: "denied"`));
    }
    expect(index).toContain('window.gtag("set", "ads_data_redaction", true)');
    expect(index).not.toMatch(/<link[^>]+rel=["'](?:preconnect|dns-prefetch)["'][^>]+(?:googlesyndication|doubleclick)/i);
  });

  it("keeps static ad-bearing routes on an explicit provider allowlist", () => {
    const scriptSrc = headers.match(/script-src [^;]+;/)?.[0] || "";
    const frameSrc = headers.match(/frame-src [^;]+;/)?.[0] || "";
    expect(headers).toContain("script-src 'self' 'unsafe-inline'");
    expect(headers).toContain("script-src-attr 'none'");
    for (const origin of [
      "https://aws-origin.dekhocampus.com",
      "https://*.googlesyndication.com",
      "https://*.googleadservices.com",
      "https://*.googletagservices.com",
      "https://*.adtrafficquality.google",
      "https://*.google.com",
      "https://*.clarity.ms",
      "https://connect.facebook.net",
    ]) expect(headers).toContain(origin);
    expect(headers).not.toContain("'unsafe-eval'");
    expect(scriptSrc).toContain("https://*.adtrafficquality.google");
    expect(frameSrc).toContain("https://*.adtrafficquality.google");
    expect(headers).not.toContain("script-src 'self' 'unsafe-inline' https: http:");
    expect(headers).not.toMatch(/connect-src 'self' https:\s+wss:(?:;|\s)/);
    expect(headers).not.toMatch(/frame-src 'self' https:(?:;|\s)/);
  });

  it("publishes the requested support contacts", () => {
    expect(index).toContain("outreach@dekhocampus.com");
    expect(index).toContain("+91-8010321712");
    expect(read("src/lib/constant.ts")).toContain('+918010321712');
  });

  it("contains no JWT-shaped bearer credential in public source or build scripts", () => {
    const source = [index, ...collectPublicText("src"), ...collectPublicText("public"), ...collectPublicText("scripts")].join("\n");
    expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  });
});
