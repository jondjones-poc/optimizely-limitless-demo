# Limitless — Hyatt ABM Proposal POC

A single-customer Optimizely **Opal** proof-of-concept for **Hyatt**: how Hyatt's global sales
team generates a personalized, research-grounded **account proposal page** for an enterprise /
corporate prospect — group room blocks, meeting & bootcamp space, and the Hyatt Leverage
year-round business-travel program — and publishes it live through Optimizely CMS + Graph.

The worked example is *Hyatt × Optimizely — a five-star basecamp for Camp Opticon 26*.

> Concept demonstration for ABM training. Not an official communication of Hyatt Hotels
> Corporation or Optimizely, Inc. Figures are illustrative; the disclaimer in the page footer
> stays in.

---

## Repository layout

The Astro app **is** the repo root, so every command runs from here — no `cd` first.

```
.
├── README.md                 # you are here
├── AGENTS.md                 # the agent guide (repo conventions + full app reference)
├── CLAUDE.md                 # thin pointer → AGENTS.md
├── package.json              # the Astro app
├── astro.config.mjs          # adapter selection (Vercel / Netlify)
├── optimizely.config.mjs     # CMS CLI config + editor field tabs
├── netlify.toml · vercel.json  # one build config per host, no base/root to set
├── src/                      # content type, layouts, Graph wiring, routes
├── public/assets/            # photography the deployed app serves
├── scripts/seed-hyatt.mjs    # seeds the example proposal via the Content API
├── design/                   # the static mock — the design of record
│   ├── index.html            #   open it straight from disk; not deployed
│   └── assets/               #   photography
├── brand-guidelines/
│   └── hyatt.md              # brand one-pager (human source of truth)
└── opal/                     # Opal exports, one folder per object type
    ├── skills/               #   hyatt-vendor-facts.skill.json
    ├── agents/               #   planner + builder specialized agents
    └── workflows/            #   wf_hyatt_proposal
```

### How the pieces fit

1. **`design/index.html`** is the hand-authored proposal page — the design everyone signs off on.
2. **`src/content-types/pages/HyattProposal.ts`** models that page as one CMS content type,
   section by section.
3. **`src/layouts/hyatt-proposal.astro`** renders it back, pixel-for-pixel, from Graph.
4. **`opal/`** holds the agent chain that writes a new one for a new account, grounded in
   `opal/skills/hyatt-vendor-facts.skill.json` for Hyatt's own claims and in live research
   for the account's. Every number the page shows is cited in its Sources section.

---

## Running the app

```bash
yarn install
cp .env.example .env       # fill in OPTIMIZELY_GRAPH_SINGLE_KEY at minimum
yarn dev                   # http://localhost:4321
```

Sync the content type to the CMS and seed the example page:

```bash
yarn cms:push                                    # sync HyattProposal to the CMS
HYATT_CONTAINER_KEY=<cms-content-key> node scripts/seed-hyatt.mjs
```

`yarn cms:push` and the seed script both need `OPTIMIZELY_CMS_CLIENT_ID` /
`OPTIMIZELY_CMS_CLIENT_SECRET`. See [`AGENTS.md`](./AGENTS.md) → "The Astro app" for the full
command and API reference.

No CMS yet? `yarn dev` then open **`/local-demo`** — it renders the proposal from the seed
script's content with no credentials and no network.

## The walkthrough deck

**`/walkthrough`** — a 24-slide reveal.js deck explaining the whole POC: the agent chain, the
content model, how the page adapts per account, and the engineering. It ships with the app, so
it deploys wherever the app does and needs no network.

`src/pages/walkthrough.html` is a plain HTML file, so you can also open it straight from disk
to present. Keyboard: arrows to move, `Esc` for the overview grid, `.` to blank the screen,
`?` for all shortcuts. Append `?print-pdf` and print for a PDF.

## Deploying

Both hosts are wired up; `astro.config.mjs` picks the adapter from the build environment, so
there's nothing to switch by hand and nothing to point at a subdirectory.

- **Vercel** — import the repo and leave **Root Directory** at the default. Vercel sets
  `VERCEL=1`, which selects the Vercel adapter; `vercel.json` supplies the framework and build
  commands.
- **Netlify** — `netlify.toml` is authoritative (Node 22, Yarn 4). Leave the UI base directory
  at `/`.

Force a target locally with `DEPLOY_TARGET=vercel yarn build` (or `netlify`).

Remember to set the environment variables from `.env.example` in the host's project settings —
`OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_CMS_URL`, and `SITE_URL` (which must equal the CMS
site's base URL exactly, or path queries return nothing — on a deployed host that's the site URL,
not `localhost:4321`).

The static mock under `design/` is a design reference and is **not** deployed.
