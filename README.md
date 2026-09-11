# Sarkari DekhoCampus

Sarkari DekhoCampus is the article-focused government jobs, results, admit cards, answer keys, admissions, syllabus and scholarship portal for `sarkari.dekhocampus.com`.

## Production architecture

- Cloudflare Pages serves the static React frontend at `https://sarkari.dekhocampus.com`.
- The frontend reuses the existing TLS-enabled DekhoCampus AWS API at `https://aws-origin.dekhocampus.com`.
- The existing AWS Lightsail, MySQL, S3 and server-side AI integrations remain shared; no second Lightsail instance is required.
- Cloudflare serves static assets without consuming the Workers request quota.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The frontend defaults to the current browser origin. Set `VITE_API_URL=http://127.0.0.1:8787` when running the API separately.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Deployment

The dedicated Cloudflare Pages project is connected directly to this repository's `main` branch. Cloudflare publishes only the Sarkari portal and cannot overwrite the main DekhoCampus frontend. `.github/workflows/deploy-sarkari-pages.yml` independently rebuilds the same immutable revision and verifies that the custom domain exposes its `version.json` marker.

One-time Cloudflare setup:

1. Create a Pages project named `sarkari-dekhocampus` and connect it to this repository's `main` branch.
2. Set the Pages build command to run the verification commands above before `npm run build`, with `dist` as the output directory.
3. Add the production custom domain `sarkari.dekhocampus.com`.
4. If DNS is not managed by Cloudflare, create a CNAME from `sarkari` to `sarkari-dekhocampus.pages.dev`.
5. Apply the updated AWS `CORS_ORIGIN` once so it includes the Sarkari custom and Pages domains.

After the one-time setup, push a verified `main` commit. To wait for and verify that connected deployment from the command line, run:

```sh
npm run deploy:prod
```

The verification command requires an authenticated GitHub CLI, a clean `main` branch, and a pushed commit.
