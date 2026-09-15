# Standing traffic and discoverability mandate

Apply this mandate to every task in this repository unless the user explicitly overrides it for that task.

## Priority order

1. Protect and improve Google Search eligibility, crawlability, indexability, canonical consistency, structured data validity, mobile usability, Core Web Vitals, accessibility, and people-first content quality.
2. Improve answer-engine and AI discovery (GEO, LLMO, and AEO) through accurate headings, concise answer-first summaries, primary-source facts, semantic HTML, structured data, stable canonical URLs, meaningful internal links, and machine-readable public documentation.
3. Preserve or improve conversion and monetization without harming search quality, page experience, consent, security, editorial independence, or AdSense policy compliance.

## Required workflow for every change

- Identify every affected public route and template, including mobile rendering, raw HTML, hydrated HTML, sitemap/robots behavior, and structured data.
- Prefer official recruiting-authority sources and original useful summaries. Never copy a competitor's wording, branding, publisher IDs, ad-slot IDs, or attribution.
- Do not fabricate dates, vacancies, eligibility, salary, fees, authorship, reviews, FAQs, locations, JobPosting fields, or freshness signals.
- Do not use keyword stuffing, doorway pages, cloaking, hidden text, scaled low-value automation, misleading redirects, fake engagement, or other search/ad policy manipulation.
- Keep query/search/empty/duplicate/private pages out of the index unless they provide a distinct, stable, useful landing-page experience.
- Keep titles, descriptions, canonicals, robots directives, Open Graph/Twitter metadata, JSON-LD, internal links, sitemap entries, and HTTP status/header behavior consistent.
- Treat mobile as the primary viewport. Preserve reflow, tap targets, reading order, full DekhoCampus wordmark, responsive tables, and low layout shift.
- Keep performance budgets and consent gates intact; ads and analytics must not create hydration errors, CSP errors, unexpected layout shift, or pre-consent tracking.
- Before completion, run proportional tests and a production build. For material public changes, verify representative live/raw/rendered routes where deployment is in scope.
- Never silently skip a discovered issue. Fix it when safely in scope; otherwise record it explicitly in the handoff with impact, blocker, and next action.

## Definition of done

A task is done only when the requested behavior works, relevant regression checks pass, affected discovery/SEO surfaces remain correct, and all known unfinished work is explicitly reported.
