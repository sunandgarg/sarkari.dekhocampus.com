import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/deploy-sarkari-pages.yml"), "utf8");

describe("Sarkari production verification workflow", () => {
  it("follows the connected Cloudflare Pages deployment from main", () => {
    expect(workflow).toMatch(/push:\s*\n\s*branches:\s*\n\s*- main/);
    expect(workflow).toContain("group: sarkari-dekhocampus-production-${{ github.ref }}");
    expect(workflow).toMatch(/cancel-in-progress: true/);
    expect(workflow).toMatch(/github\.ref != 'refs\/heads\/main'/);
    expect(workflow).toContain("https://sarkari.dekhocampus.com/version.json");
  });

  it("does not require a second credentialed Wrangler deployment", () => {
    expect(workflow).not.toMatch(/cloudflare\/wrangler-action/);
    expect(workflow).not.toMatch(/CLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)/);
  });
});
