#!/usr/bin/env node
/**
 * Seed the single example `HyattProposal` CMS item — the Hyatt × Optimizely
 * ("Camp Opticon 26") account proposal.
 *
 * Content is ported 1:1 from the static mock in `design/index.html`. Repeating
 * collections are stored as arrays of JSON strings (see
 * `src/content-types/pages/HyattProposal.ts`); the Astro layout parses them
 * back into objects. Image fields are plain public paths (`/assets/…`) — the
 * photography ships in `public/assets/`, so there is no asset-upload step.
 *
 * This app is single-customer: no brand hubs, no `brandId`, no persona pages.
 * One content type, one page.
 *
 * Usage:
 *   HYATT_CONTAINER_KEY=<cms-content-key> node scripts/seed-hyatt.mjs
 *   SEED_DELETE=1 …                        # delete the existing item first
 *   DRY_RUN=1 …                            # print what would be sent, call nothing
 *   HYATT_SLUG=hyatt-optimizely            # route segment override
 *   HYATT_DISPLAY_NAME='…'                 # CMS display name override
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// True only when run as `node scripts/seed-hyatt.mjs`. When this module is
// *imported* (the dev-only `/local-demo` route uses PAGE as a fixture) we skip
// env validation and the API calls — importing must never touch the CMS.
const isMain = !!process.argv[1] && path.resolve(process.argv[1]) === __filename;

// ponytail: 4-line .env reader instead of a dotenv dependency — same as seed-canon.
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    // Strip a trailing `# comment` and any wrapping quotes, the way dotenv/Vite
    // do — .env.example ships inline comments, so pasted values sit in front of
    // one and would otherwise become part of the secret.
    const value = m[2].replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
    process.env[m[1]] = value;
  }
}

const CLIENT_ID = process.env.OPTIMIZELY_CMS_CLIENT_ID;
const CLIENT_SECRET = process.env.OPTIMIZELY_CMS_CLIENT_SECRET;
const CMS_URL = process.env.OPTIMIZELY_CMS_URL;
/** CMS API v1 keys are undashed UUIDs. Accept either form from .env / the UI. */
const CONTAINER = String(process.env.HYATT_CONTAINER_KEY || '').replace(/-/g, '');
const SLUG = process.env.HYATT_SLUG || 'hyatt-optimizely';
const DISPLAY_NAME = process.env.HYATT_DISPLAY_NAME;
const API = 'https://api.cms.optimizely.com/v1/content';
const DRY_RUN = !!process.env.DRY_RUN;

const RICH_TEXT_FIELDS = new Set([
  'heroHeadlineHtml',
  'heroLedeHtml',
  'trailHeadingHtml',
  'teamHeadingHtml',
  'offerHeadingHtml',
  'expHeadingHtml',
  'stayHeadingHtml',
  'careHeadingHtml',
  'quoteHtml',
  'ctaHeadingHtml',
]);

/** Wrap preview3-style property values for CMS API v1 (`{ value }` / richText `{ value: { html } }`). */
function wrapProperties(properties) {
  const out = {};
  for (const [key, val] of Object.entries(properties)) {
    out[key] = RICH_TEXT_FIELDS.has(key) ? { value: { html: val } } : { value: val };
  }
  return out;
}

// ─── Env validation ──────────────────────────────────────────────────────
const missing = [];
if (!CMS_URL) missing.push('OPTIMIZELY_CMS_URL');
if (!CLIENT_ID) missing.push('OPTIMIZELY_CMS_CLIENT_ID');
if (!CLIENT_SECRET) missing.push('OPTIMIZELY_CMS_CLIENT_SECRET');
if (isMain && missing.length && !DRY_RUN) {
  console.error(`Missing required env: ${missing.join(', ')}`);
  console.error('Set them in app/.env (see AGENTS.md → Environment variables) and re-run.');
  process.exit(1);
}

if (isMain && !CONTAINER && !DRY_RUN) {
  console.error('Missing HYATT_CONTAINER_KEY.');
  console.error('');
  console.error('This script needs the CMS content key of the container (site content root or');
  console.error('folder) the proposal should be created under. There is no safe default:');
  console.error('content created under `globalassets` is invisible in the CMS tree UI, so the');
  console.error('page would exist but never appear for editors.');
  console.error('');
  console.error('Find the key in the CMS UI (the target page/folder\'s content key) and run:');
  console.error('  HYATT_CONTAINER_KEY=<key> node scripts/seed-hyatt.mjs');
  process.exit(1);
}

/** array of objects → array of JSON strings (matches the array<string> fields) */
const j = (arr) => arr.map((o) => JSON.stringify(o));

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'api:admin',
  });
  const res = await fetch('https://api.cms.optimizely.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

/**
 * Delete any existing item under the container whose URL contains the slug.
 * Property updates via PATCH/versions are broken in preview3 — delete + recreate
 * is the documented workaround, so SEED_DELETE is also how you "update".
 */
async function deleteBySlug(token, slug) {
  const key = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY;
  if (!key) {
    console.warn('  · SEED_DELETE set but OPTIMIZELY_GRAPH_SINGLE_KEY missing — skipping delete.');
    return;
  }
  // Graph's IContentMetadataWhereInput has no `container` field (it silently made
  // this query error out, so SEED_DELETE no-opped and the recreate 400'd on a
  // duplicate route segment). Filter by content type instead, then by slug below.
  const q = `query($t:String){_Content(where:{_metadata:{types:{eq:$t}}},limit:100){items{_metadata{key url{default}}}}}`;
  const r = await fetch('https://cg.optimizely.com/content/v2?auth=' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: { t: PAGE.contentType } }),
  });
  const data = await r.json();
  if (data?.errors) console.warn(`  · Graph lookup errored: ${data.errors[0]?.message}`);
  for (const it of data?.data?._Content?.items ?? []) {
    if ((it._metadata.url?.default ?? '').includes(slug)) {
      const delKey = String(it._metadata.key || '').replace(/-/g, '');
      await fetch(`${API}/${delKey}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      console.log(`  · deleted existing ${slug} (${it._metadata.key})`);
    }
  }
}

async function createPage(token, { displayName, contentType, routeSegment, properties }) {
  // preview3 was retired 2026-08-01 — v1 uses NewContent + initialVersion, then :publish.
  const body = {
    contentType,
    container: CONTAINER,
    initialVersion: {
      displayName,
      locale: 'en',
      routeSegment,
      properties: wrapProperties(properties),
    },
  };
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const createText = await res.text();
  if (!res.ok) throw new Error(`Create failed (${routeSegment}): ${res.status} ${createText}`);
  const created = createText ? JSON.parse(createText) : {};
  const location = res.headers.get('location') || res.headers.get('Location') || '';
  const key =
    created.key ||
    location.match(/\/content\/([0-9a-f]+)/i)?.[1] ||
    '';
  if (!key) {
    throw new Error(
      `Create returned no key (${res.status}): body=${createText || '(empty)'} location=${location || '(none)'}`,
    );
  }

  const version =
    created.version ??
    created.initialVersion?.version ??
    (await latestVersion(token, key));
  if (!version) throw new Error(`Create returned no version for ${key}: ${createText || JSON.stringify(created)}`);

  const pub = await fetch(`${API}/${key}/versions/${version}:publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true }),
  });
  const pubText = await pub.text();
  if (!pub.ok) throw new Error(`Publish failed (${routeSegment}): ${pub.status} ${pubText}`);
  return { key, version, ...created };
}

async function latestVersion(token, key) {
  const res = await fetch(`${API}/${key}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data.items ?? data.results ?? [];
  return items[0]?.version ?? items[0]?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// Page content (ported from design/index.html)
// ─────────────────────────────────────────────────────────────────────────

export const PAGE = {
  displayName: DISPLAY_NAME || 'Hyatt × Optimizely — Your Five-Star Basecamp for Camp Opticon',
  contentType: 'HyattProposal',
  routeSegment: SLUG,
  properties: {
    // ─── Account + nav chrome ─────────────────────────────────────────
    accountName: 'Team Optimizely',
    preparedFor: 'Prepared exclusively for',
    wordmark: 'HYATT',
    navCtaLabel: 'Start the Conversation',

    // ─── Hero ─────────────────────────────────────────────────────────
    eyebrow: 'A Hyatt proposal, crafted for the Optimizely events team',
    heroHeadlineHtml: 'Every great camp deserves a <em class="g">five-star basecamp.</em>',
    heroLedeHtml:
      'Camp Opticon 26 pitches up at the Javits Center on September 1, then crosses to the Barbican on October 13.[^1][^2] Two cities, six weeks apart, and a thousand people who need somewhere to sleep. That last part is the bit we’d like to take off your hands — <b>the beds, the rooms you meet in, the coffee at 7 a.m.</b> Boots on the ground. Heads on our pillows.',
    heroPrimaryCta: 'Build Your Basecamp →',
    heroSecondaryCta: 'See What’s on the Trail',
    heroImage: '/assets/nyc-grand-hyatt-dusk.jpg',
    heroImageCaption: 'Grand Hyatt New York · Blue hour over Midtown',
    heroStats: j([
      { count: 1500, suffix: '+', label: 'Hotels & resorts worldwide' },
      { count: 83, label: 'Countries, six continents' },
      { count: 15, prefix: '~', suffix: '%', label: 'Leverage program savings' },
      { value: '1957', label: 'Caring for people since' },
    ]),

    // ─── The Trail Map ────────────────────────────────────────────────
    trailEyebrow: 'The Trail Map',
    trailHeadingHtml: 'We’ve studied your itinerary.<br /><em class="g">Here’s where we fit in.</em>',
    trailLede:
      'It’s a heavy year. A flagship camp on two continents, partner gatherings by invitation, and an Academy bootcamp circuit that runs whether or not anyone’s watching the calendar.[^3] We looked at every pin. There’s a Hyatt inside a short walk of nearly all of them.',
    trailCards: j([
      {
        date: 'September 1, 2026 · New York',
        title: 'Camp Opticon — New York',
        where: 'North Javits Center · 445 11th Ave, Manhattan',
        body: 'One big day, Seth Godin on the bill, and several thousand people arriving in Hudson Yards at once. Midtown will notice. The rooms nearest the hall go first, and they go early.',
        terms: ['Trailhead', 'Outpost', 'Tent Talks', 'Bonfire', 'Agent Lodge'],
      },
      {
        date: 'October 13, 2026 · London',
        title: 'Camp Opticon — London',
        where: 'The Barbican Centre · Silk Street, City of London',
        body: 'Silk Street sits in the middle of the Square Mile, where hotel stock is thinner than the map suggests. Your EMEA campers will want beds inside the City rather than a 6 a.m. Central line run from wherever they could find one.',
        terms: ['Agentic AI', 'Experimentation', 'Digital Experience'],
      },
      {
        date: 'All year · Everywhere',
        title: 'Optimizely Academy Bootcamps',
        where: 'Instructor-led · Customer cities worldwide',
        body: 'The Academy runs instructor-led bootcamps most months, in whichever city the customers are. Hands-on training is fussier than a conference: power at every seat, a projector that works, and somewhere to put the sandwiches.',
        terms: ['Classroom Setup', 'Hybrid-Ready A/V', 'Fuel Breaks'],
      },
      {
        date: 'August 2026 · Invite only',
        title: 'Partner Forum & Digital Summit',
        where: 'Partner gatherings · Sydney and beyond',
        body: 'Partners rarely remember the session. They remember the twenty minutes afterwards, in a lobby, with someone they’d been emailing for a year. Lobbies are our whole business.',
        terms: ['Partner Forum', 'Digital Summit', 'Opticon Online'],
      },
    ]),
    // ─── Who runs this ────────────────────────────────────────────────
    // No named individuals on purpose. The teams below are inferred from public
    // Optimizely material at the function level, which is all the page needs;
    // `teamNote` says so on the page rather than implying inside knowledge.
    teamEyebrow: 'Who runs this',
    teamHeadingHtml: 'Four teams carry this year.<br /><em class="g">We work for all four.</em>',
    teamLede:
      'A camp on two continents plus a bootcamp circuit is never one team’s job. Here is who we think owns which part at Optimizely, and what we would take off each of their desks. Correct us where we have guessed wrong — that is the fastest first conversation we could have.',
    teamCards: j([
      {
        team: 'Global Events Marketing',
        scope: 'Owns Camp Opticon end to end',
        owns: ['Venue contracts in New York and London[^1]', 'Delegate accommodation and comms', 'Speaker and VIP logistics'],
        gain: 'One negotiated block per city, one master bill, and rooming lists we chase instead of you.',
      },
      {
        team: 'Optimizely Academy',
        scope: 'Runs the bootcamp circuit',
        owns: ['Instructor-led sessions most months[^3]', 'Whichever city the customers are in', 'Classroom layout and A/V that works', 'Catering that fits a training day'],
        gain: 'A standing rate and a repeatable room setup, so a new city is a booking rather than a project.',
      },
      {
        team: 'Partner & Alliances',
        scope: 'Hosts the invitation-only gatherings',
        owns: ['Partner Forum and Digital Summit', 'Hospitality around the sessions, which is the part partners remember'],
        gain: 'Private dining and suites already inside the block.',
      },
      {
        team: 'Workplace & Travel',
        scope: 'Owns the year-round spend',
        owns: ['Field team travel between events', 'Booking policy and approvals', 'What the events actually cost'],
        gain: 'Hyatt Leverage rates on every trip, not only the ones attached to a camp.[^4]',
      },
    ]),
    teamNote:
      'These four teams are our read of public Optimizely material, not an org chart we have been shown. We have deliberately named no individuals. Tell us who actually owns each part and we will redo this page against the real answer.',

    marqueeItems: [
      'Boots on the ground',
      'Heads on our pillows',
      'Room blocks near the Javits',
      'Minutes from the Barbican',
      'We care for people so they can be their best',
    ],

    // ─── The Offer ────────────────────────────────────────────────────
    offerEyebrow: 'The Offer',
    offerHeadingHtml: 'Three ways we lighten <em class="g">your pack.</em>',
    offerLede:
      'Three things, shaped around how you actually run a year: two big camps, a partner circuit, and a lot of ordinary travel in between.',
    offerPillars: j([
      {
        num: 'No. 01',
        title: 'Basecamp Room Blocks',
        body: 'One negotiated block a few streets from the Javits Center, another inside the City near the Barbican. Your campers walk to the keynote instead of commuting to it.',
        image: '/assets/nyc-grand-hyatt-sign.jpg',
        alt: 'Hyatt sign glowing above the Manhattan streets at night',
        items: [
          'Negotiated group rates, with attrition terms we can flex',
          'One master bill. One person who answers the phone.',
          'We manage the rooming list, including the late changes',
          'Speaker and VIP rooms held back before the block opens',
        ],
      },
      {
        num: 'No. 02',
        title: 'Bootcamp-Ready Space',
        body: 'Your Agent Lodge, our house. We reset a room overnight — classroom one day, cabaret the next — and the catering is good enough that people photograph it.',
        image: '/assets/classroom.jpg',
        alt: 'A bright hotel training room set classroom-style for a corporate bootcamp',
        items: [
          'Classroom and workshop sets, 10 to 300 people',
          'Hybrid-ready A/V, plus event Wi-Fi that isn’t the guest Wi-Fi',
          'Fuel breaks and quiet rooms, scheduled around your agenda rather than ours',
          'Terraces and lounges for the evening',
        ],
      },
      {
        num: 'No. 03',
        title: 'Year-Round with Hyatt Leverage',
        body: 'Camps end. Travel doesn’t. Hyatt Leverage is the corporate rate programme your field team books against for the other fifty weeks of the year.',
        image: '/assets/guestroom.jpg',
        alt: 'A serene Hyatt guestroom with a king bed in warm evening light',
        items: [
          'Savings of up to ~15% off standard rates, globally — terms and eligibility apply[^4]',
          'An admin dashboard your travel manager can actually read',
          'World of Hyatt points and elite credit still earned on qualifying stays',
          'Coverage across 83 countries, so the programme travels where your field team does[^5]',
        ],
      },
    ]),

    // ─── The Experiment ───────────────────────────────────────────────
    expEyebrow: 'The Experiment',
    expHeadingHtml: 'You test everything.<br />So <em class="g">we ran the numbers too.</em>',
    expLede:
      'Hypothesis: one basecamp beats forty-seven open browser tabs. We are aware this is not a rigorously controlled trial.',
    controlTag: 'Variant A · Control',
    controlTitle: 'The Old Way',
    controlItems: [
      'Everyone books their own room, across six neighbourhoods',
      'Rates climb the week the nearby hotels fill',
      'Forty minutes each way to an 8:45 keynote',
      'Two hundred separate expense reports',
      'Your keynote speaker is somewhere in Brooklyn',
      'Nobody can tell you what the whole thing cost until November',
    ],
    challengerTag: 'Variant B · Challenger',
    challengerTitle: 'The Hyatt Way',
    challengerItems: [
      'One basecamp, ten minutes on foot from the Javits doors',
      'Block rate agreed months before the rush',
      'Campers run into each other at breakfast, which is rather the point',
      'One master bill',
      'Speakers, staff and partners under the same roof',
    ],
    expResults: j([
      { value: '+38%', label: 'More sleep per camper*' },
      { value: '−100%', label: 'Open booking tabs*' },
      { value: '10 min', label: 'Walk to the keynote hall' },
      { value: '1', label: 'Invoice*' },
    ]),
    expFootnote:
      '*Illustrative figures, warmly estimated, not measured — this whole section is a joke told in your own house style. The real numbers depend on your dates and headcount, and we’d rather put those in a proposal than on a web page.',

    // ─── Where You'll Stay ────────────────────────────────────────────
    stayEyebrow: 'Where You’ll Stay',
    stayHeadingHtml: 'Basecamps, already <em class="g">on the map.</em>',
    stayLede:
      'A short list for each city. All of them are walkable to your venue, and all of them can hold a block for Team Optimizely on a phone call.',
    stayCities: j([
      {
        city: 'New York City',
        pin: 'Near the Javits Center',
        cards: [
          {
            name: 'Hyatt Grand Central New York',
            dist: '~15 min to Javits',
            body: 'The Midtown flagship, right beside the terminal. It’s the one that can absorb a large block without splitting it, and anyone arriving by train walks in off the concourse.',
            image: '/assets/nyc-grand-hyatt-dusk.jpg',
            alt: 'Grand Hyatt New York glowing at dusk above Grand Central',
          },
          {
            name: 'Hyatt Place & Hyatt House Chelsea',
            dist: '~10 min walk to Javits',
            body: 'The closest pair to camp. Hyatt House rooms have kitchens, which matters for crew who land three days early and leave two days late.',
            image: '/assets/nyc-grand-hyatt-sign.jpg',
            alt: 'The Hyatt sign illuminated over a Manhattan avenue at night',
          },
          {
            name: 'The Unbound Collection — Grayson',
            dist: 'Near Bryant Park',
            body: 'For the closing-night reception. The roof does the work.',
            image: '/assets/rooftop-networking.jpg',
            alt: 'Guests networking on a rooftop terrace as the Manhattan skyline lights up at dusk',
          },
        ],
      },
      {
        city: 'London',
        pin: 'Near the Barbican',
        cards: [
          {
            name: 'Hyatt Regency London Blackfriars',
            dist: '~10 min to the Barbican',
            body: 'Ten minutes’ walk to Silk Street. This is the obvious home block for Camp Opticon London, and the one we’d hold first.',
            image: '/assets/london-blackfriars-dusk.jpg',
            alt: 'Hyatt Regency London Blackfriars facade at dusk',
          },
          {
            name: 'Hyatt Regency & Hyatt House Stratford',
            dist: 'East London hub',
            body: 'Two brands, one building: Regency for delegations, House for the people staying a fortnight. Useful when a bootcamp tour lands in London.',
            image: '/assets/london-stratford-entrance.jpg',
            alt: 'Hyatt Regency and Hyatt House London Stratford entrance',
          },
          {
            name: 'Andaz London Liverpool Street',
            dist: 'One stop from Moorgate',
            body: 'A Victorian railway hotel that never quite behaves like one. Good meeting rooms for Agent Lodge build sessions, and the bar is a destination in its own right.',
            image: '/assets/boardroom.jpg',
            alt: 'An elegant Hyatt boardroom set for an executive session',
          },
        ],
      },
    ]),

    // ─── Why Hyatt ────────────────────────────────────────────────────
    careEyebrow: 'Why Hyatt',
    careHeadingHtml: 'We care for people so they can be <em class="g">their best.</em>',
    careLede:
      'We have said that since 1957, and we have had a long time to work out what it means in practice.[^5] Mostly it means somebody is awake at 6 a.m. when your registration desk needs an extra table, and the same person is still there at the closing reception.',
    careItems: j([
      {
        title: 'A dedicated events account lead',
        body: 'One person, both cities, who knows the run-of-show as well as you do and doesn’t need it re-explained in October.',
      },
      {
        title: 'Fuel breaks and quiet rooms',
        body: 'Booked in advance, not improvised on the day.',
      },
      {
        title: 'World of Hyatt for every camper',
        body: 'Points and elite night credit on qualifying stays. Camp swag that compounds.',
      },
      {
        title: '1,500+ hotels, 83 countries',
        body: 'A ten-person bootcamp in Austin gets the same account team as a thousand-person camp in Manhattan. That is the part scale is actually for.[^5]',
      },
    ]),
    careImage: '/assets/guestroom.jpg',
    careImageAlt: 'A tranquil Hyatt guestroom prepared for an evening of rest',

    // ─── Quote strip ──────────────────────────────────────────────────
    quoteHtml:
      '“You build digital experiences worth remembering. We build the places your people remember them from.”',
    quoteCite: 'Hyatt Global Sales · For Team Optimizely',

    // ─── Start the Conversation ───────────────────────────────────────
    ctaEyebrow: 'Start the Conversation',
    ctaHeadingHtml: 'Let’s walk this trail <em class="g">together.</em>',
    ctaBody:
      'Tell us roughly what you need and when. Even a rough headcount for September is enough to start holding rooms; the rest we can work out on a call. You’ll get a proposal with real rates in it, not another deck.',
    ctaKicker: 'Campfires optional. Care guaranteed.',
    signatureInitial: 'H',
    signatureName: 'Your Hyatt Events & Travel Team',
    signatureRole: 'Global Sales · Groups, Meetings & Business Travel',
    planOptions: [
      'Camp Opticon New York — room block (Sept 1)',
      'Camp Opticon London — room block (Oct 13)',
      'Optimizely Academy bootcamp series — meeting space',
      'Partner Forum / Digital Summit — group travel',
      'Year-round business travel — Hyatt Leverage',
      'All of it — let’s talk trail strategy',
    ],
    formButtonLabel: 'Send It Up the Trail →',
    formNote: 'Concept demo — submissions stay in your browser and go nowhere.',
    successHeading: 'Consider it packed.',
    successBody:
      'Your note is on its way (in spirit — this is a demo). In a live campaign, your Hyatt account lead would reply within one business day.',

    // ─── Footer ───────────────────────────────────────────────────────
    footerTagline: 'We care for people so they can be their best.',
    footerCols: j([
      {
        title: 'For Optimizely',
        links: [
          { label: 'The Trail Map', url: '#trail' },
          { label: 'The Offer', url: '#offer' },
          { label: 'The Experiment', url: '#experiment' },
          { label: 'Where You’ll Stay', url: '#stay' },
        ],
      },
      {
        title: 'Hyatt Business',
        links: [
          { label: 'Hyatt Leverage', url: 'https://www.hyatt.com/leverage' },
          { label: 'Hyatt.com', url: 'https://www.hyatt.com' },
          { label: 'World of Hyatt', url: 'https://world.hyatt.com' },
        ],
      },
      {
        title: 'The Camps',
        links: [
          { label: 'Camp Opticon 26', url: 'https://www.optimizely.com/field-notes/opticon' },
          { label: 'Optimizely Academy', url: 'https://academy.optimizely.com' },
        ],
      },
    ]),
    disclaimer:
      'Concept demonstration asset created for account-based marketing training purposes. Not an official communication of Hyatt Hotels Corporation or Optimizely, Inc. Event details referenced from public Optimizely listings (Camp Opticon 26: New York, Sept 1, 2026; London, Oct 13, 2026). Photography sourced from publicly available web references for mock-up use only. Hyatt Leverage benefits summarized from hyatt.com/leverage; terms and eligibility apply. No data is collected by this page.',

    // ─── Sources ──────────────────────────────────────────────────────
    // Only what the mock's legal paragraph already cites — nothing invented.
    sourcesEyebrow: 'Show your working',
    sourcesHeading: 'Grounded in public listings.',
    sourcesLede:
      'Camp dates and programme come from Optimizely’s public event listings. The Hyatt figures come from Hyatt’s own published pages. The small numbers scattered through the page link down here.',
    sources: j([
      { n: 1, label: 'Camp Opticon 26 — New York, September 1, 2026 (public event listing)', url: 'https://www.optimizely.com/field-notes/opticon', group: 'account', publisher: 'Optimizely', date: '2026' },
      { n: 2, label: 'Camp Opticon 26 — London, October 13, 2026 (public event listing)', url: 'https://www.optimizely.com/field-notes/opticon', group: 'account', publisher: 'Optimizely', date: '2026' },
      { n: 3, label: 'Optimizely Academy — instructor-led bootcamps', url: 'https://academy.optimizely.com', group: 'account', publisher: 'Optimizely' },
      { n: 4, label: 'Hyatt Leverage — business travel program (up to ~15% off standard rates; terms and eligibility apply)', url: 'https://www.hyatt.com/leverage', group: 'hyatt', publisher: 'Hyatt Hotels Corporation' },
      { n: 5, label: 'Hyatt — 1,500+ hotels & resorts across 83 countries; caring for people since 1957', url: 'https://www.hyatt.com', group: 'hyatt', publisher: 'Hyatt Hotels Corporation' },
    ]),

    // ─── SEO ──────────────────────────────────────────────────────────
    metaTitle: 'Hyatt × Optimizely — Your Five-Star Basecamp for Camp Opticon',
    metaDescription:
      'A Hyatt ABM concept page prepared exclusively for the Optimizely events team — room blocks, bootcamp-ready meeting space, and year-round travel care for Camp Opticon 26 and beyond.',
  },
};

(async () => {
  if (!isMain) return;
  if (DRY_RUN) {
    console.log('DRY_RUN — nothing will be sent.');
    console.log(`  container:    ${CONTAINER ?? '(HYATT_CONTAINER_KEY unset)'}`);
    console.log(`  route:        /${PAGE.routeSegment}`);
    console.log(`  displayName:  ${PAGE.displayName}`);
    console.log(`  contentType:  ${PAGE.contentType}`);
    console.log(`  properties:   ${Object.keys(PAGE.properties).length} fields`);
    console.log(JSON.stringify(PAGE, null, 2));
    return;
  }

  console.log('Fetching CMS access token…');
  const token = await getToken();
  console.log('Token acquired.\n');
  console.log(`Seeding under container ${CONTAINER}.\n`);

  if (process.env.SEED_DELETE) await deleteBySlug(token, PAGE.routeSegment);

  console.log(`Creating: ${PAGE.displayName} (${PAGE.contentType})`);
  try {
    const result = await createPage(token, PAGE);
    console.log(`  ✓ key: ${result.key ?? result._metadata?.key ?? '(unknown)'}  ·  route: /${PAGE.routeSegment}`);
  } catch (e) {
    console.error(`  ✗ ${e.message}`);
    process.exitCode = 1;
  }
  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
