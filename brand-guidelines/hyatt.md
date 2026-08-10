# Hyatt — Brand one-pager (corporate / enterprise ABM)

Human source-of-truth for the Hyatt ABM proposal pages. Keep it lean; the rendered
theme lives in the page CSS (`design/index.html` → `app/src/layouts/`).

> **Concept demonstration.** This asset was written for an Optimizely Opal POC and for
> account-based-marketing training. It is not an official communication of Hyatt Hotels
> Corporation. Only publicly known Hyatt facts are used.

## Identity in one line
**"We care for people so they can be their best."** Hyatt's purpose, not a tagline —
guiding the company since **1957**. For a corporate account it translates into a very
practical kind of care: someone who knows your calendar, your delegates, and your budget.

## Colour
A two-note palette: deep **navy** as the ground, **gold** as the single signal colour,
warm **cream** for light sections. Gold is used for accents, rules, and key figures —
never as a wash.

| Token | Hex | Use |
|---|---|---|
| **Navy** | `#0e2240` | Primary dark sections, headings on light |
| Navy — deep | `#091a32` | Hero, footer, stat band, deepest background |
| Navy — soft | `#162c4f` | Hover state on navy surfaces |
| **Gold** | `#c2a060` | Accent, eyebrows, CTAs, rules, quote strip |
| Gold — light | `#dcc08a` | Gold-on-dark text, key figures, hover |
| Cream | `#f7f3ec` | Light section background |
| Cream-2 | `#efe8da` | Alt light section background |
| Ink | `#1d2b45` | Body text on light |
| Slate | `#4a5a77` | Secondary / supporting body text |

> Approximate values chosen for this concept, matched to the mock — request official
> Hyatt brand standards before any real-world use.

## Type
- **Display / headings:** **Cormorant Garamond** (500–700, italic available). The italic
  gold phrase (`<em class="g">`) is the signature move — one emphasised clause per heading.
- **UI / body:** **Inter** (300–700) for all lede, list, form, and nav copy.
- **Eyebrows:** Inter 600, 12px, `.28em` tracking, uppercase, gold, with a hairline rule.
- Wordmark is rendered as **styled text** — `HYATT` in Cormorant, `.34em` tracking, with a
  gold `✦` — rather than hotlinking a Hyatt asset.

## Voice & tone
Warm, hospitable, quietly premium. Hyatt hosts; it does not sell at you.

1. **Warm before clever.** Lead with care for the people travelling, not with features.
2. **Quietly premium.** Restraint signals quality. No exclamation marks, no "world-class",
   no "unparalleled", no breathless superlatives.
3. **Specific over sweeping.** "Ten minutes' walk to Silk Street" beats "superbly located".
4. **Short sentences, warm cadence.** Occasional fragments for rhythm; never stacked.
5. **The account's language, respectfully borrowed.** Mirror the customer's own vocabulary
   (for Optimizely: camps, campers, experiments) with a light hand — one motif, not a costume.
6. **Never overclaim.** Every number is either sourced or openly flagged as illustrative.
   Playful figures must carry a footnote saying so.
7. **Human sign-off.** Close as a named team, not a brand voice.

## The three commercial pillars
1. **Group room blocks** — negotiated group rates, flexible attrition, one master bill and
   one point of contact, rooming lists managed end-to-end, VIP/speaker rooms held in advance.
2. **Meeting, event & bootcamp space** — classroom, boardroom, cabaret and workshop setups,
   hybrid-ready A/V and dedicated event Wi-Fi, catering and wellbeing breaks, reception
   terraces and lounges.
3. **Hyatt Leverage — year-round business travel** — a negotiated corporate rate program
   with **savings of up to ~15% off standard rates** globally, an admin dashboard for
   bookings/spend/travellers, and **World of Hyatt** points and elite credit still earned
   on qualifying stays.

## Portfolio scale (the facts the page may cite)
- **1,500+ hotels and resorts** worldwide
- **83 countries across six continents**
- Caring for people since **1957**
- **World of Hyatt** loyalty program — points and elite night credit on qualifying stays
- Corporate-relevant brand families: **Hyatt Regency**, **Grand Hyatt**, **Andaz**,
  **Hyatt Place**, **Hyatt House**, **The Unbound Collection by Hyatt**

## Ideal customer profile (enterprise / corporate)
A multi-national organisation that both **runs events** and **travels continuously**:
a recurring flagship conference across two or more continents, invite-only partner
gatherings, an instructor-led training or bootcamp circuit, and a distributed field team
in the air most weeks. Sweet spot: consolidating scattered self-booking and one-off venue
deals into one negotiated relationship covering rooms, space, and year-round travel.

## Buying committee (who signs, by pillar)
| Persona | Owns / cares about |
|---|---|
| Head of Events / Event Operations | Venue fit, room blocks, A/V, delegate experience, run-of-show |
| Corporate Travel Manager | Programme rates, policy compliance, traveller satisfaction, coverage |
| Procurement | Negotiated terms, attrition and cancellation risk, supplier consolidation |
| Executive Assistant / Exec Ops | VIP and speaker rooms, upgrades, discreet handling, last-minute changes |
| CFO / Finance | Total spend, one master bill, forecastability, savings evidence |
| Marketing / Field Marketing | Brand-worthy spaces, reception and networking moments, regional events |

## Competitive frame
vs. other global hotel groups' corporate programmes (Marriott, Hilton, IHG,
Accor), plus convention-centre house blocks, self-booking through OTAs, and standalone
conference venues.

## Writing the proposal page
How the voice rules land in each section of `HyattProposal`:

| Section | Job | Voice notes |
|---|---|---|
| **Hero** | Name the account's biggest logistical burden and offer to carry it | One italic gold clause in the headline. Lede ≤ 3 sentences, ends on a warm beat. Stat band carries only sourced portfolio facts. |
| **Trail map** (their calendar) | Prove we read their itinerary | Their events, their names, their dates — cite the account source for each. No selling yet; observation earns the pitch. |
| **The Offer** | Three pillars, in the account's terms | Exactly three. Bullets are concrete deliverables, never adjectives. Leverage numbers must match the vendor-facts file. |
| **The Experiment** | Mirror the account's own culture (A/B framing) | The one place playfulness is allowed — and therefore the one place the footnote is mandatory: illustrative figures, openly labelled. |
| **Where You'll Stay** | A walkable shortlist per city | Real properties and real brand names only; distances qualified ("~10 min walk"). Two lines of copy each. |
| **Why Hyatt** | Purpose, made practical | Lead with the 1957 purpose line, then four tangible commitments. Warmth here, not scale-boasting. |
| **Quote strip / CTA** | Hand it back to a human | Gold ground, one sentence. CTA names the next step and the person who answers; the form note admits it's a demo. |
| **Sources** | Make every claim checkable | Hyatt's own facts → group `"hyatt"` (from `hyatt-vendor-facts`); prospect research → group `"account"`. Inline `[^n]` markers link down. |

## Voice
Hospitable, precise, unhurried. Navy and gold do the signalling; the copy does the caring.
Nothing shouts — Hyatt lets the specificity and the welcome do the talking.
