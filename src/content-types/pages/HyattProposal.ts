import { contentType } from '@optimizely/cms-sdk';

/**
 * Hyatt Proposal — the account-level ABM proposal hub Hyatt's global sales team
 * sends to one enterprise/corporate account (events + group travel + Hyatt
 * Leverage). Modelled 1:1 on the static mock `design/index.html`
 * (Hyatt × Optimizely / Camp Opticon 26).
 *
 * This is a **single-page** content type: one item = one complete account
 * proposal. Repeating collections are stored as arrays of JSON strings and
 * parsed by the layout (`parseItems` in `src/layouts/hyatt-lib.ts`) — the same
 * convention the rest of the platform uses.
 *
 * The `exp*` / `control*` / `challenger*` field NAMES are historical — they come
 * from the Camp Opticon worked example, where this section was an A/B test. Treat
 * them as neutral slots: LEFT column = the account's world today, RIGHT column =
 * the same world with Hyatt, plus a strip of result tiles. The framing is chosen
 * per account by the Opal builder agent (experiment / before-after / risk / cost
 * / operational), so most accounts must NOT say "Variant A / Variant B". Renaming
 * the fields would need a cms:push:force plus a re-seed, which isn't worth it —
 * the editor-facing `displayName`s carry the neutral wording instead.
 *
 * ponytail: images are plain path/URL strings (e.g. `/assets/guestroom.jpg`),
 * not CMS asset references. The demo ships its photography in `public/assets/`,
 * so an editor pastes a path and the agent seeds one — no asset upload step.
 * Switch to `contentReference` if editors need to manage the media library.
 *
 * Repeating-field JSON shapes (each array item is a JSON string):
 *   heroStats:    { "count": 1500, "prefix": "~", "suffix": "+", "label": "Hotels & resorts worldwide" }
 *                 `count` numeric → the layout animates a count-up. Use `value`
 *                 for a non-numeric stat ("1957") and it renders as-is.
 *   trailCards:   { "date": "September 1, 2026 · New York", "title": "Camp Opticon — New York",
 *                   "where": "North Javits Center · 445 11th Ave", "body": "…",
 *                   "terms": ["Trailhead","Outpost"] }
 *   teamCards:    { "team": "Global Events", "scope": "Owns Camp Opticon end to end",
 *                   "owns": ["Venue and room blocks","Delegate comms"],
 *                   "gain": "One contract and one master bill instead of nine",
 *                   "person": "Jane Doe", "personTitle": "Director, Global Events" }
 *                 `person`/`personTitle` are OPTIONAL and must only be filled from a
 *                 public, current, cited source — see the note above the field.
 *   offerPillars: { "num": "No. 01", "title": "Basecamp Room Blocks", "body": "…",
 *                   "image": "/assets/nyc-grand-hyatt-sign.jpg", "alt": "…",
 *                   "items": ["Negotiated group rates","…"] }
 *   expResults:   { "value": "-18%", "label": "Cost per delegate night*" }
 *   stayCities:   { "city": "New York City", "pin": "Near the Javits Center",
 *                   "cards": [{ "name": "Hyatt Grand Central New York", "dist": "~15 min to Javits",
 *                               "body": "…", "image": "/assets/nyc-grand-hyatt-dusk.jpg", "alt": "…" }] }
 *   careItems:    { "title": "A dedicated events account lead", "body": "One human who knows…" }
 *   planOptions:  plain strings — the "What are you planning?" select options
 *   footerCols:   { "title": "Hyatt Business", "links": [{ "label": "Hyatt Leverage", "url": "https://…" }] }
 *   sources:      { "n": 1, "label": "…", "url": "…", "group": "account"|"hyatt",
 *                   "publisher": "…", "date": "…" }
 *                 Inline `[^n]` markers in any HTML field link down to the entry.
 */
export const HyattProposal = contentType({
  key: 'HyattProposal',
  baseType: '_page',
  displayName: 'Hyatt Proposal',
  properties: {
    // ─── Account + nav chrome ────────────────────────────────────────
    accountName:  { type: 'string', displayName: 'Account Name (Team Optimizely)', required: true, group: 'hyaccount', sortOrder: 10, localized: true },
    preparedFor:  { type: 'string', displayName: 'Prepared-For Line (Prepared exclusively for)', group: 'hyaccount', sortOrder: 20, localized: true },
    wordmark:     { type: 'string', displayName: 'Wordmark (HYATT)', group: 'hyaccount', sortOrder: 30 },
    navCtaLabel:  { type: 'string', displayName: 'Nav CTA Label', group: 'hyaccount', sortOrder: 40, localized: true },

    // ─── Hero ────────────────────────────────────────────────────────
    eyebrow:          { type: 'string',   displayName: 'Hero Eyebrow',            group: 'hyhero', sortOrder: 10, localized: true },
    heroHeadlineHtml: { type: 'richText', displayName: 'Hero Headline (HTML — <em class="g"> for gold italic)', group: 'hyhero', sortOrder: 20, localized: true },
    heroLedeHtml:     { type: 'richText', displayName: 'Hero Lede (HTML)',        group: 'hyhero', sortOrder: 30, localized: true },
    heroPrimaryCta:   { type: 'string',   displayName: 'Hero Primary CTA',        group: 'hyhero', sortOrder: 40, localized: true },
    heroSecondaryCta: { type: 'string',   displayName: 'Hero Secondary CTA',      group: 'hyhero', sortOrder: 50, localized: true },
    heroImage:        { type: 'string',   displayName: 'Hero Image Path',         group: 'hyhero', sortOrder: 60 },
    heroImageCaption: { type: 'string',   displayName: 'Hero Image Caption (vertical tag)', group: 'hyhero', sortOrder: 70, localized: true },
    heroStats: {
      type: 'array', items: { type: 'string' },
      displayName: 'Hero Stat Band (JSON: {count,prefix,suffix,label} or {value,label})', group: 'hyhero', sortOrder: 80, localized: true,
    },

    // ─── The Trail Map — the account's event calendar ─────────────────
    trailEyebrow:     { type: 'string',   displayName: 'Trail Eyebrow',       group: 'hytrail', sortOrder: 10, localized: true },
    trailHeadingHtml: { type: 'richText', displayName: 'Trail Heading (HTML)', group: 'hytrail', sortOrder: 20, localized: true },
    trailLede:        { type: 'string',   displayName: 'Trail Lede',          group: 'hytrail', sortOrder: 30, localized: true },
    trailCards: {
      type: 'array', items: { type: 'string' },
      displayName: 'Trail Cards (JSON: {date,title,where,body,terms[]})', group: 'hytrail', sortOrder: 40, localized: true,
    },
    marqueeItems: { type: 'array', items: { type: 'string' }, displayName: 'Marquee Phrases', group: 'hytrail', sortOrder: 50, localized: true },

    // ─── Who runs this — the account's own event/travel owners ───────
    // Named individuals are deliberately OPTIONAL. A proposal that guesses who
    // someone is reads as surveillance and is wrong often enough to lose the
    // deal, so `person`/`personTitle` may only be filled from a public, current
    // source that is cited in `sources` — otherwise the card names the TEAM only,
    // which is what the page actually needs. `teamNote` says on-page how the
    // teams were identified, so nobody mistakes inference for inside knowledge.
    teamEyebrow:     { type: 'string',   displayName: 'Team Eyebrow',       group: 'hyteam', sortOrder: 10, localized: true },
    teamHeadingHtml: { type: 'richText', displayName: 'Team Heading (HTML)', group: 'hyteam', sortOrder: 20, localized: true },
    teamLede:        { type: 'string',   displayName: 'Team Lede',          group: 'hyteam', sortOrder: 30, localized: true },
    teamCards: {
      type: 'array', items: { type: 'string' },
      displayName: 'Team Cards (JSON: {team,scope,owns[],gain,person?,personTitle?})', group: 'hyteam', sortOrder: 40, localized: true,
    },
    teamNote: { type: 'string', displayName: 'Team Note (how these teams were identified)', group: 'hyteam', sortOrder: 50, localized: true },

    // ─── The Offer — what Hyatt proposes ─────────────────────────────
    offerEyebrow:     { type: 'string',   displayName: 'Offer Eyebrow',       group: 'hyoffer', sortOrder: 10, localized: true },
    offerHeadingHtml: { type: 'richText', displayName: 'Offer Heading (HTML)', group: 'hyoffer', sortOrder: 20, localized: true },
    offerLede:        { type: 'string',   displayName: 'Offer Lede',          group: 'hyoffer', sortOrder: 30, localized: true },
    offerPillars: {
      type: 'array', items: { type: 'string' },
      displayName: 'Offer Pillars (JSON: {num,title,body,image,alt,items[]})', group: 'hyoffer', sortOrder: 40, localized: true,
    },

    // ─── The Experiment — the A/B framing ────────────────────────────
    expEyebrow:      { type: 'string',   displayName: 'Persuasion Eyebrow',       group: 'hyexperiment', sortOrder: 10, localized: true },
    expHeadingHtml:  { type: 'richText', displayName: 'Persuasion Heading (HTML)', group: 'hyexperiment', sortOrder: 20, localized: true },
    expLede:         { type: 'string',   displayName: 'Persuasion Lede (the premise)', group: 'hyexperiment', sortOrder: 30, localized: true },
    controlTag:      { type: 'string',   displayName: 'Left Column Tag (today, without Hyatt)', group: 'hyexperiment', sortOrder: 40, localized: true },
    controlTitle:    { type: 'string',   displayName: 'Left Column Title', group: 'hyexperiment', sortOrder: 50, localized: true },
    controlItems:    { type: 'array', items: { type: 'string' }, displayName: 'Left Column Items', group: 'hyexperiment', sortOrder: 60, localized: true },
    challengerTag:   { type: 'string',   displayName: 'Right Column Tag (with Hyatt)', group: 'hyexperiment', sortOrder: 70, localized: true },
    challengerTitle: { type: 'string',   displayName: 'Right Column Title', group: 'hyexperiment', sortOrder: 80, localized: true },
    challengerItems: { type: 'array', items: { type: 'string' }, displayName: 'Right Column Items', group: 'hyexperiment', sortOrder: 90, localized: true },
    expResults: {
      type: 'array', items: { type: 'string' },
      displayName: 'Results Tiles (JSON: {value,label})', group: 'hyexperiment', sortOrder: 100, localized: true,
    },
    expFootnote:     { type: 'string', displayName: 'Experiment Footnote', group: 'hyexperiment', sortOrder: 110, localized: true },

    // ─── Where You'll Stay — the property shortlist, grouped by city ──
    stayEyebrow:     { type: 'string',   displayName: 'Stay Eyebrow',       group: 'hystay', sortOrder: 10, localized: true },
    stayHeadingHtml: { type: 'richText', displayName: 'Stay Heading (HTML)', group: 'hystay', sortOrder: 20, localized: true },
    stayLede:        { type: 'string',   displayName: 'Stay Lede',          group: 'hystay', sortOrder: 30, localized: true },
    stayCities: {
      type: 'array', items: { type: 'string' },
      displayName: 'Stay Cities (JSON: {city,pin,cards[{name,dist,body,image,alt}]})', group: 'hystay', sortOrder: 40, localized: true,
    },

    // ─── Why Hyatt ───────────────────────────────────────────────────
    careEyebrow:     { type: 'string',   displayName: 'Care Eyebrow',       group: 'hycare', sortOrder: 10, localized: true },
    careHeadingHtml: { type: 'richText', displayName: 'Care Heading (HTML)', group: 'hycare', sortOrder: 20, localized: true },
    careLede:        { type: 'string',   displayName: 'Care Lede',          group: 'hycare', sortOrder: 30, localized: true },
    careItems: {
      type: 'array', items: { type: 'string' },
      displayName: 'Care Items (JSON: {title,body})', group: 'hycare', sortOrder: 40, localized: true,
    },
    careImage:    { type: 'string', displayName: 'Care Image Path', group: 'hycare', sortOrder: 50 },
    careImageAlt: { type: 'string', displayName: 'Care Image Alt',  group: 'hycare', sortOrder: 60, localized: true },

    // ─── Quote strip ─────────────────────────────────────────────────
    quoteHtml: { type: 'richText', displayName: 'Quote (HTML)', group: 'hyquote', sortOrder: 10, localized: true },
    quoteCite: { type: 'string',   displayName: 'Quote Attribution', group: 'hyquote', sortOrder: 20, localized: true },

    // ─── Start the Conversation (CTA + lead form) ────────────────────
    ctaEyebrow:     { type: 'string',   displayName: 'CTA Eyebrow',       group: 'hycta', sortOrder: 10, localized: true },
    ctaHeadingHtml: { type: 'richText', displayName: 'CTA Heading (HTML)', group: 'hycta', sortOrder: 20, localized: true },
    ctaBody:        { type: 'string',   displayName: 'CTA Body',          group: 'hycta', sortOrder: 30, localized: true },
    ctaKicker:      { type: 'string',   displayName: 'CTA Kicker', group: 'hycta', sortOrder: 40, localized: true },
    signatureInitial: { type: 'string', displayName: 'Signature Avatar Initial', group: 'hycta', sortOrder: 50 },
    signatureName:    { type: 'string', displayName: 'Signature Name',   group: 'hycta', sortOrder: 60, localized: true },
    signatureRole:    { type: 'string', displayName: 'Signature Role',   group: 'hycta', sortOrder: 70, localized: true },
    planOptions:    { type: 'array', items: { type: 'string' }, displayName: 'Form: "What are you planning?" Options', group: 'hycta', sortOrder: 80, localized: true },
    formButtonLabel:{ type: 'string', displayName: 'Form Button Label',  group: 'hycta', sortOrder: 90, localized: true },
    formNote:       { type: 'string', displayName: 'Form Note',          group: 'hycta', sortOrder: 100, localized: true },
    successHeading: { type: 'string', displayName: 'Form Success Heading', group: 'hycta', sortOrder: 110, localized: true },
    successBody:    { type: 'string', displayName: 'Form Success Body',    group: 'hycta', sortOrder: 120, localized: true },

    // ─── Footer ──────────────────────────────────────────────────────
    footerTagline: { type: 'string', displayName: 'Footer Tagline', group: 'hyfooter', sortOrder: 10, localized: true },
    footerCols: {
      type: 'array', items: { type: 'string' },
      displayName: 'Footer Columns (JSON: {title,links[{label,url}]})', group: 'hyfooter', sortOrder: 20, localized: true,
    },
    disclaimer: { type: 'string', displayName: 'Legal Disclaimer', group: 'hyfooter', sortOrder: 30, localized: true },

    // ─── Sources ─────────────────────────────────────────────────────
    // group – 'account' (research on the prospect) | 'hyatt' (Hyatt's own facts)
    sourcesEyebrow: { type: 'string', displayName: 'Sources Eyebrow', group: 'hysources', sortOrder: 10, localized: true },
    sourcesHeading: { type: 'string', displayName: 'Sources Heading', group: 'hysources', sortOrder: 20, localized: true },
    sourcesLede:    { type: 'string', displayName: 'Sources Lede',    group: 'hysources', sortOrder: 30, localized: true },
    sources: {
      type: 'array', items: { type: 'string' },
      displayName: 'Sources (JSON: {n,label,url,group,publisher,date})', group: 'hysources', sortOrder: 40, localized: true,
    },

    // ─── SEO ─────────────────────────────────────────────────────────
    metaTitle:       { type: 'string', displayName: 'Meta Title',       group: 'seo', sortOrder: 10, localized: true },
    metaDescription: { type: 'string', displayName: 'Meta Description', group: 'seo', sortOrder: 20, localized: true },
  },
});
