# AGENTS.md — Limitless (Hyatt ABM POC)

> Canonical agent guide for this repo. Tool-agnostic; `CLAUDE.md` imports this file.

## What this repo is

A **single-customer** Optimizely Opal proof-of-concept for **Hyatt**. It shows how Hyatt's
global sales team can generate a personalized, research-grounded **ABM proposal page** for one
enterprise / corporate account — covering group room blocks, meeting & bootcamp space, and the
Hyatt Leverage year-round business-travel program.

The worked example is *Hyatt × Optimizely — a five-star basecamp for Camp Opticon 26*.

Audience for the POC: sales & pre-sales engineers and solutions teams running the walkthrough.

### Extracted from the multi-customer platform — deliberately smaller

This repo was lifted out of the multi-customer `opal-nzt-48` platform and reduced to one
customer. The following machinery was **dropped on purpose** — do not reintroduce it:

| Dropped | Why |
|---|---|
| `customers/<name>/` folder layer | one customer; assets live at the repo root |
| `shared/` + `customer-template/` | nothing to share with, nothing to onboard |
| The generic `web_research` agent | multi-customer machinery; research happens in this repo's own chain |
| `brands.ts` / `brandProperty()` / the `Brand` hub type | one brand → the layout registry keys on content type alone |
| Product/PIM content types, brand-index and brand-landing layouts | not part of this POC |
| `platform/app/` nesting | one app → it *is* the repo root, so every yarn command runs from here |

If a second customer ever appears, go back to `opal-nzt-48` — don't grow this repo sideways.

## Layout

**The Astro app is the repo root** — there's no `app/` subfolder, so `yarn dev` / `yarn build` /
`node scripts/…` all run from here. The POC's non-code assets sit alongside it as sibling folders.

```
./
├── AGENTS.md                 # ← this file: the only agent guide (repo + app)
├── CLAUDE.md                 # thin pointer → @AGENTS.md
├── README.md                 # human-facing overview
├── package.json              # the Astro app — root, not nested
├── astro.config.mjs          # adapter selection (Vercel / Netlify)
├── optimizely.config.mjs     # CMS CLI config + editor property groups
├── netlify.toml              # Netlify build (no `base` — the app is the root)
├── vercel.json               # Vercel build (Root Directory = repo root)
├── src/                      # content types, layouts, lib, routes
│   └── pages/walkthrough.html #   the POC walkthrough deck, served at /walkthrough
├── public/assets/*.jpg       # photography the deployed app serves
├── scripts/seed-hyatt.mjs    # seeds the example proposal via the Content API
├── design/                   # the hand-authored static mock — the design of record
│   ├── index.html            #   open directly in a browser; not deployed
│   └── assets/*.jpg          #   same photography (see working rule 2)
├── brand-guidelines/         # hyatt.md — the human source-of-truth one-pager
└── opal/                     # every Opal export, one folder per object type
    ├── skills/               #   hyatt-vendor-facts.skill.json
    ├── agents/               #   hyatt_proposal_{planner,builder}-specialized-agent.json
    └── workflows/            #   hyatt_proposal_workflow-workflow.json (wf_hyatt_proposal)
```

> **All Opal exports live under `opal/<type>/`** — that's the one place to look for anything that
> gets imported into Opal, and the subfolder names match the CLI's nouns (`skill`, `agent`,
> `workflow`), so the import order below reads straight off the tree.

## Working rules

1. **`design/index.html` is the design of record.** The live layout
   (`src/layouts/hyatt-proposal.astro`) is a port of it. If the design changes, change both,
   or the demo's "here's the mock, here's it live from the CMS" story breaks.
2. **Photography has two homes on purpose.** `design/assets/` keeps the mock openable straight
   from the filesystem (`file://`, no server); `public/assets/` is what the deployed app serves.
   Add an image to both.
3. **One build config per host, both at the root.** `netlify.toml` and `vercel.json` sit next to
   `package.json` with no `base` / Root Directory to set, because the app *is* the root. Don't
   reintroduce a nested app folder — that's exactly what made the Netlify dev plugin resolve
   `base` twice and crash `astro dev` on the platform this repo came from.
4. **The app reference is further down this file.** Content types, layouts, Graph wiring, commands
   and pitfalls all live under "The Astro app" below — there's no separate app guide any more.
5. **Brand guidelines are written twice, and the two halves live apart on purpose:**
   `brand-guidelines/hyatt.md` is the human source-of-truth one-pager; its machine counterpart is
   `opal/skills/hyatt-vendor-facts.skill.json`, filed with the other Opal exports because that's
   what actually gets imported. Write the markdown first, then generate the skill — and when a
   fact changes, change both.

## Opal conventions

- Skills (formerly "instructions") are referenced in agent prompts as
  `` {skill: `<mention-handle>`} `` — always the backtick-wrapped mention handle, never the
  human title. Comma-separate multiple: `` {skill: `handle-a`, `handle-b`} ``.
- **`agent import` drops parameter `default`s** (they come back `null`), but **`agent update` keeps
  them.** So defaults don't need setting by hand in the Opal UI — `scripts/deploy-opal.mjs` replays
  them with an `agent update` right after each import. (Older notes in this repo said the UI was the
  only way; that was wrong.)
- Use the **`opal-cli` skill** for all Opal interactions (list/create/import/run/inspect).

### Deploying these exports

```bash
node scripts/deploy-opal.mjs --dry     # validate, write nothing
node scripts/deploy-opal.mjs           # skills → agents → workflow, then replay defaults
node scripts/deploy-opal.mjs --only skills
```

Re-running is safe and idempotent. The script exists because the **export and import shapes don't
match**, and every mismatch fails in a way that reads like something else:

| Object | Gotcha the script handles |
|---|---|
| Skill | A skill export is a JSON **array**, but `skill import` demands an object. Uses `skill create` on element 0, and strips `product_sku`/`instance_id` (stored as `[]`, validated as strings → 422) plus the server-assigned guid/timestamp fields. |
| Skill | `skill list --search` matches the **title**, not the mention handle, so an existing skill looks absent and the create returns `409 already taken`. The script indexes by `mentionHandle` and treats a 409 as "already deployed". |
| Agent | `agent import` drops parameter `default`s; the script replays them via `agent update`. `agent update` needs the **GUID**, and `agent list` returns only `agentId` + display `name` (no slug) as a **bare array** — so it matches on `name`. |
| Workflow | A workflow export is an envelope `{rootAgentId, agents:{…}}` whose sub-agent entries are `{error, agent_id}` stubs. Importing it whole fails with "Missing required field: schema_version" (`--tree` doesn't help). The script imports `agents[rootAgentId]` alone; sub-agents resolve by slug from `specialized_agents_required`. |

**Deployed objects** (Opal instance `a937a159…`):

| Object | Handle / slug | GUID |
|---|---|---|
| Skill — Hyatt Vendor Facts | `hyatt-vendor-facts` | `3654b605-db84-49c8-89f5-c24d253e870d` |
| Skill — Hyatt Property Catalog | `hyatt-property-catalog` | `868bd2f9-2384-4362-840c-0f1167ec2e94` |
| Skill — AI-Generated Content Tells | `ai-content-tells` | `72eb19f9-d158-407f-adf6-4f1ea087e9cb` |
| Agent — Hyatt Proposal Planner | `hyatt_proposal_planner` | `e8526bfd-516d-4d2f-8a8a-78777517b8df` |
| Agent — Hyatt Proposal Builder | `hyatt_proposal_builder` | `fa2225fb-a159-4b35-a208-e695d803e26b` |
| Workflow — Hyatt Proposal Workflow | `wf_hyatt_proposal` | `cf64e485-217e-49d2-9559-ccd7fc5c3a28` |

> **`ai-content-tells` is org-wide and shared.** The handle already resolved to a skill deployed for
> an earlier POC, so `deploy-opal.mjs` skips it and the builder's `{skill: `ai-content-tells`}`
> mention resolves to **that** one. `opal/skills/ai-content-tells.skill.json` here is a *trimmed*
> variant (prose tells only, plus a "writing this page without the tells" section) that is **not
> deployed**. To make it live you'd have to delete the org skill first — and other POCs' agents
> reference the same handle, so don't do that casually.

## The chain

```
chat request  →  hyatt_proposal_planner  →  account research  →  hyatt_proposal_builder
                 (parses the ask into      (grounds the page      (creates + publishes one
                  an account brief)         in public facts)       HyattProposal in the CMS)
```

The builder reads three skills:

| Skill | Supplies |
|---|---|
| `hyatt-vendor-facts` | every Hyatt-side claim (portfolio scale, brand families, Leverage, World of Hyatt, 1957) — never re-researched per account |
| `hyatt-property-catalog` | the hotel shortlist. 14 business-event cities, ~40 properties, each with its brand family, what it's good for in a group booking (large delegations / extended-stay crews / executive-VIP / cost-managed rooms), a **qualified** walking distance to the city's convention venue, and an image URL. The builder *selects* 2–3 per event city instead of researching hotels every run — which is what makes positioning the right property per prospect cheap. |
| `ai-content-tells` | the anti-AI-slop house style the builder self-reviews against before writing to the CMS |

Account-side claims come from the research step. Both land in the
page's `sources` array (`group: "hyatt"` vs `group: "account"`) so the page shows the citations
behind its numbers — inline `[^n]` markers link down to them.

**The footer disclaimer stays.** Concept demonstration, figures illustrative, not an official
communication of Hyatt or the account. The builder and the seed script both emit it.

## Adapting to a different account

The page **structure** is fixed and reusable; the **framing and vocabulary are per-account**. Read
this before editing the builder prompt or judging output for a new account.

The worked example (Hyatt → Optimizely) is idiomatic to Optimizely twice over, and neither is
Hyatt's:

| Example-specific thing | Where it comes from | What another account gets |
|---|---|---|
| "The Experiment" · Variant A/Control vs Variant B/Challenger | Optimizely sells experimentation, so an A/B frame is its native language | a different framing — see below |
| "basecamp", "campers", "the trail map", "bonfire" | Optimizely's *Camp Opticon* event branding | its own event vocabulary, or plain business English |

Nothing about either is hardcoded in the CMS or the layout — every visible string is a field, and
the layout contains no "Variant" or "camp" copy. **Adaptation therefore lives in the agent prompts**:

- The **planner** extracts an `ACCOUNT VOCABULARY` block (event branding, house idiom, register, and
  an explicit *do-not-use* list) and recommends a `persuasion_framing` from
  `experiment` / `before_after` / `risk` / `cost` / `operational`, defaulting to `before_after` when
  unsure. `experiment` is reserved for accounts that sell experimentation or analytics.
- The planner also extracts an `EVENT & TRAVEL OWNERS` block — which of the account's **own teams**
  runs which part of the calendar — for the "Who runs this" section. See its own section below for
  the naming policy; the short version is teams by default, individuals only when publicly cited.
- The **builder** reads both from the research canvas and picks the framing before writing copy. The
  `control*` / `challenger*` fields are **generic slots** — LEFT column is the account's world today,
  RIGHT is that world with Hyatt — and for most accounts must NOT say "Variant A / Variant B".

**The known failure mode** is the builder inheriting the previous account's conceit, because its own
worked example is soaked in Optimizely's. The prompt counters it with a banned-word list
("A bank does not have a basecamp"), a framing table with five worked account pairings, and an
explicit "copy the SHAPE, never the WORDING" label on the JSON example. If output for a new account
comes back talking about basecamps, that guard failed — strengthen it rather than hand-editing the page.

Editor-facing labels are neutral for the same reason: the CMS tabs are **Calendar** and
**Persuasion** (not "The Trail Map" / "The Experiment"), and the fields read "Left/Right Column".
The field *names* stay `exp*` / `control*` / `challenger*` — renaming them would cost a
`cms:push:force` and a re-seed for zero functional gain.

## The walkthrough deck

`src/pages/walkthrough.html` is a 24-slide **reveal.js** deck covering the whole POC, served by
the app at **`/walkthrough`**. It is a plain `.html` file rather than an `.astro` page, which
matters twice:

- Astro serves a bare `.html` in `src/pages/` as a static route, so `/walkthrough` and
  `/walkthrough/` both resolve with no extra route file.
- It is **not** in `public/`. A file at `public/walkthrough/index.html` is shadowed by the
  catch-all SSR route — `/walkthrough/` rendered the 404 shell and only the explicit
  `/walkthrough/index.html` worked. Being plain HTML also means you can open it from disk to
  present, with no dev server.

reveal.js 5.2.0 and its CSS are **inlined verbatim** (MIT). Nothing is fetched at runtime —
verified zero external requests — so the deck works offline, in a locked-down browser, and as a
published artifact where the CSP blocks every external host.

Regenerating it: the deck is assembled by a script that reads the slide bodies out of the file it
also writes, so it is idempotent and safe to re-run. Editing slide content directly in the HTML is
fine; the theme lives in one `<style>` block near the top. Sizes are fixed px against reveal's
1280x720 stage, which reveal scales as one unit — do not reintroduce `clamp()`/`vw`, which fights
that transform.

## X-ray mode — the "how was this built" overlay

The proposal layout carries an **X-ray** overlay: a floating button (bottom-right) or the `x` key
traces every component with the **Opal tools and CMS data that produced it** — the sales narrative
for *how* a personalized page gets assembled. `Escape` exits. It's `src/layouts/hyatt-xray.astro`,
dropped into `hyatt-proposal.astro`; 14 elements are annotated.

To trace a new section, add three attributes to its wrapper:

```astro
<section id="…" data-xray="Section name" data-xt="tool_one|tool_two" data-xd="CMS: fieldA, fieldB|what it's grounded in">
```

`data-xt` = pipe-separated tools, `data-xd` = pipe-separated data sources. Keep the attributions
**truthful** — the whole point is that a prospect can audit the claim. Say which `sources` group a
section's facts come from (`"account"` research vs `"hyatt"` vendor skill) and flag illustrative
figures as illustrative.

Two constraints the overlay must keep: **no viewport units** (it's `position:fixed`, so it adds
nothing to document height and can't retrigger the preview-iframe scroll loop), and `hyxr-`/`hyxray-`
class names only. Cards clamp against a running `lastBottom` so they never overlap when sections sit
close together — re-clamped every frame, so expanding one pushes the rest.

---

# The Astro app

The renderer: an Astro SSR app that fetches a `HyattProposal` item from Optimizely Graph and
renders it as the proposal page. It's a **single-customer, single-content-type** app — resist
growing it; the value of the demo is that the whole path from CMS field to pixel fits in your head.

## What's already wired (do NOT rebuild)

| Concern | Where | What it does |
|---|---|---|
| Graph client | `src/lib/graph.ts` → `createGraphClient()` | `GraphClient` from `OPTIMIZELY_GRAPH_SINGLE_KEY` |
| SDK content-type registry | `src/lib/graph.ts` → `initContentTypeRegistry([...])` | Required by the SDK. Add new types here. |
| Locale parsing | `src/lib/graph.ts` → `parseSlug()` | Locale from the first URL segment, with a default |
| Path fetch | `src/lib/graph.ts` → `getFullContentByPath()` | Raw GraphQL. Add `... on YourType { … }` fragments here. |
| Preview fetch + index-lag fallback | `src/pages/preview.astro` | Cascades exact → locale-only → key-only, with a notice |
| Catch-all routing | `src/pages/[...slug].astro` | Resolves the layout; no per-type branching |
| Layout dispatch | `src/layouts/registry.ts` → `resolveLayout(types)` | contentType → layout. Both routes go through it. |
| Repeating-field parsing + citations | `src/layouts/hyatt-lib.ts` | `parseItems`, `strings`, `richHtml`, `cite`, `sourceDomain` |
| Fallback site shell | `src/layouts/Base.astro` | Only seen on errors/404/unregistered types |
| Adapter selection | `astro.config.mjs` | Vercel on Vercel, Netlify elsewhere; `DEPLOY_TARGET` overrides |
| CLI sync + editor field tabs | `optimizely.config.mjs` | Globs `src/content-types/**/*.ts`; declares property groups |

## The content model

One page type: **`HyattProposal`** (`src/content-types/pages/HyattProposal.ts`). One item = one
complete account proposal. Conventions that matter:

- **Repeating collections are arrays of JSON strings.** Each item is `JSON.stringify(obj)`; the
  layout calls `parseItems()`. Every shape is documented in the doc comment at the top of the
  content-type file — that comment is the contract the Opal page builder and the seed script both
  write against. Change a shape there, change it in all three places.
- **richText fields select `{ html }`** in the GraphQL fragment and render via `richHtml()`.
- **Images are plain path strings** — either a local `/assets/guestroom.jpg` or, for
  `stayCities[].cards[].image`, an **external URL** from the property catalog. Not CMS asset references — the
  photography ships in `public/assets/`. Deliberate: it keeps seeding to a single API call with no
  upload step. Switch to `contentReference` if editors need the media library.
- **Sources + inline citations.** `sources` is an array of `{n,label,url,group,publisher,date}`
  with `group` = `"account"` (research on the prospect) or `"hyatt"` (Hyatt's own facts). Anywhere
  in an HTML field, `[^n]` becomes a superscript link down to source *n*. Only emit a marker you
  also list, or you get a dead anchor.
- **Property groups are page sections in page order** (`optimizely.config.mjs`), so editing
  top-to-bottom in the CMS matches reading top-to-bottom on the page.

### "Who runs this" — naming the account's own teams

The `hyteam` section (`teamCards`) calls out the teams **inside the prospect** that run its events
and travel, and what each would gain. It is the most persuasive part of the page and the easiest to
get badly wrong, so the policy is explicit in three places (content type comment, planner prompt,
builder prompt):

- **Teams by default, never people.** `person` / `personTitle` are optional and may only be filled
  from a **public, current, cited** source that puts that individual in that role. Otherwise the
  card names the function alone — which is all the argument actually needs.
- The planner marks each team `EVIDENCED` (a public source names it) or `INFERRED` (a reasonable
  split of work, nothing public says so). Both go on the page; an `INFERRED` team never gets a name.
- `teamNote` is **mandatory** whenever there are cards. It says on the page that these teams are a
  read of public material rather than an org chart, and invites the correction. That invitation is
  the point — it's a cheap, specific opening question for the sales conversation.
- Vary the `owns` bullet count between cards. Four cards with exactly three bullets each is an
  AI-written tell, and real teams don't own equal amounts.

Why not just name the individuals? A guessed name reads as surveillance, and a stale one (someone
moved role eight months ago) costs the meeting outright. Naming the team is nearly as specific and
cannot be wrong in that way.

`#team` is deliberately **not** in the page nav — six links plus the CTA wrap onto three lines at
1440px and collide with the "prepared exclusively for" block. The section sits directly under the
calendar, which is where it reads anyway.

## Adding a content type (all four steps, or it breaks confusingly)

1. **Define** it in `src/content-types/pages/MyPage.ts` with `contentType({ key, baseType: '_page', … })`.
2. **Register** it in the `initContentTypeRegistry([...])` array in `src/lib/graph.ts`. *This is
   the step that gets forgotten* — skip it and the SDK throws
   `Content type "MyPage" not included in the registry.` at request time, which reads like a Graph
   problem.
3. **Extend the fragments** — add a `MY_PAGE_FRAGMENT` in `src/lib/graph.ts` and include it in
   `ALL_PAGE_FRAGMENTS`. Both the path query and the preview fallback consume that one constant,
   so this is a single edit. Missing fragment = the item resolves but every field is `undefined`.
4. **Add a layout + one registry entry.** Create `src/layouts/hyatt-<variant>.astro` (takes a
   `content` prop) and register it in `src/layouts/registry.ts`. Use `fullDocument: true` if it
   renders its own `<html>`/`<head>` — those layouts also receive a `preview` prop in preview mode.
   **Never** add per-type branching to the routes.

Then `yarn cms:push` to make the type editable in the CMS UI.

## Styling

- `hyatt-proposal.astro` is a **full document with its own scoped CSS**, ported verbatim from
  `design/index.html`. That CSS — the navy/gold/cream tokens, Cormorant Garamond + Inter — is
  the brand system for this page. Edit it there, and keep the mock in sync.
- `src/styles/global.css` is a minimal native **Tailwind v4** entry used only by `Base.astro`.
  **Never** add the Tailwind Play CDN (`cdn.tailwindcss.com`) or an inline `tailwind.config` —
  it's an unconfigured runtime build, flagged not-for-production, and diverges from these tokens.

### Prefix page classes `hy-` — DaisyUI leaks into this page

`global.css` loads DaisyUI, and the routes import `Base.astro`, which imports `global.css`. Astro
therefore injects the Tailwind+DaisyUI bundle into the **proposal page too**, even though that page
is a full document that never asks for it. Any generic class name you use silently inherits
DaisyUI's component styles for whatever the page's own rule doesn't set.

This is not theoretical: an unprefixed `.stats` picked up DaisyUI's `display:inline-grid`, so the
navy stat band shrink-wrapped to its 1180px content and left the rest of the viewport cream — it
read as "broken and off-centre" but was a naming collision, not a layout bug. Seven classes
collided (`hero`, `stats`, `stat`, `btn`, `btn-ghost`, `card`, `avatar`); all are now `hy-`-prefixed.

Before introducing a class name, check it against the bundle:

```bash
yarn build
# Only the bundle that actually contains DaisyUI — globbing all of dist/_astro/*.css
# also matches this page's OWN extracted CSS, so every class you just wrote looks
# like a collision.
grep -l -- '--color-base-100' dist/_astro/*.css \
  | xargs grep -ohE '\.[a-z][a-z0-9-]*[,{: ]' \
  | sed 's/[,{: ]$//; s/^\.//' | sort -u | grep -x '<your-class>'
```

Prefixing is the cheap fix; the alternative is dropping Tailwind/DaisyUI entirely (only `Base.astro`
and the two routes' error blocks use them), which would remove the collision surface for good.

## Commands

```bash
yarn dev                # dev server on :4321 (strict — see astro.config.mjs)
yarn build              # SSR build (adapter chosen by DEPLOY_TARGET / VERCEL)
yarn cms:login           # verify CMS credentials
yarn cms:push            # sync content type definitions to the CMS
yarn cms:push:force      # force push (overwrites — needed when fields change; may lose data)
yarn cms:pull            # pull definitions from the CMS

# Seed the example proposal (Content API — needs the CMS client id/secret)
HYATT_CONTAINER_KEY=<cms-content-key> node scripts/seed-hyatt.mjs
DRY_RUN=1 node scripts/seed-hyatt.mjs                                  # print the payload only
SEED_DELETE=1 HYATT_CONTAINER_KEY=<key> node scripts/seed-hyatt.mjs    # delete-by-slug, then recreate
```

## Environment variables

See `.env.example`. `OPTIMIZELY_GRAPH_SINGLE_KEY` is the only one needed to render published
content; `OPTIMIZELY_CMS_URL` is needed for preview; the client id/secret are needed for
`cms:push` and seeding.

**`SITE_URL` must equal the CMS site's base URL exactly** — `getFullContentByPath` filters on it,
so a mismatch returns nothing and looks like missing content. For this instance that's
`http://localhost:4321`, which is why the dev server is pinned to 4321 with `strictPort` rather
than allowed to drift to the next free port (`astro.config.mjs`). If 4321 is busy, free it —
`lsof -ti:4321 | xargs -r kill -9` — don't move the app.

## Known pitfalls

- **`Content type X not in registry`** → step 2 above. The CLI knowing a type is not the SDK
  knowing it.
- **Fields come back `undefined`** → step 3. The item resolves from `_metadata` alone.
- **A NEW FIELD on an existing type renders on `/local-demo` but is empty on the live CMS page** →
  same cause as step 3, and easy to miss because half the stack works. `HYATT_PROPOSAL_FRAGMENT`
  in `src/lib/graph.ts` lists every field **explicitly**, so a field you added to the content type,
  pushed, and seeded is still absent from the query. `/local-demo` bypasses Graph entirely and
  therefore can't catch it. Adding a field = content type + `optimizely.config.mjs` group (if new)
  + the fragment + the layout + the seed.
- **Preview shows a stale version, with a blue notice** → expected. Graph is eventually
  consistent; the fallback cascade is doing its job. Don't remove it.
- **Content created via the API isn't in the CMS tree** → it landed under `globalassets`. Only
  content under the site's content root is visible.
- **`POST /versions` rejects properties that are present** ("Property 'X' is required") → known
  preview3 bug. Delete and recreate instead — that's why the seed script has `SEED_DELETE`.
- **`buildConfig` import** → in cms-sdk v1.0.0 it comes from the main module, not
  `@optimizely/cms-sdk/buildConfig` (which is empty).
- **`SEED_DELETE=1` appears to work but the recreate fails with `400 "Name in URL" … already in
  use`** → the delete-by-slug lookup queried `_metadata.container`, which **no longer exists** in
  Graph's `IContentMetadataWhereInput`. The GraphQL error was swallowed by a `?? []`, so the delete
  silently matched nothing. Fixed (filters on `_metadata.types` instead) and it now warns on
  `data.errors`. If a Graph query ever returns nothing unexpectedly, log `data.errors` before
  believing the empty result.
- **An external property image 404s on the page** → the catalog skill's image URLs are external
  (Wikimedia `Special:FilePath`). They were verified 200 on 2026-08-10; re-check any you add, and
  fall back to a local `/assets/*.jpg` with honest "representative" alt text when none verifies.
- **A layout element is styled by something you didn't write** → DaisyUI class collision; see
  "Prefix page classes `hy-`" above.
- **Infinite scroll in CMS preview** → a `100vh` element inside the preview's auto-resizing iframe
  feeds the host's height measurement back into its own height. `body[data-preview]` scopes a fixed
  height for preview only; `svh`/`dvh` do **not** help. Check it without a CMS token at
  `/local-demo?preview=1`.
- **A scoped-CSS edit seems ignored in dev** → Astro's dev server re-injects a cached CSS module
  over the SSR-inlined `<style>`, so `curl` shows your rule and the browser doesn't. Restart dev
  after `rm -rf .astro node_modules/.vite`.
