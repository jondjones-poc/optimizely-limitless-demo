import {
  GraphClient,
  initContentTypeRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
} from '@optimizely/cms-sdk';
import type { PreviewParams } from '@optimizely/cms-sdk';
import { HyattProposal } from '../content-types/pages/HyattProposal.js';

/**
 * Register every content type the site might encounter. The SDK throws
 * `Content type "X" not included in the registry.` at request time otherwise —
 * this is the step that's easiest to forget when adding a type.
 */
initContentTypeRegistry([
  BlankExperienceContentType,
  BlankSectionContentType,
  HyattProposal,
]);

/** Supported locales — first entry is the default/fallback. */
export const SUPPORTED_LOCALES = ['en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export function isLocale(segment: string): segment is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(segment);
}

/**
 * Parse Astro's catch-all `[...slug]` into a locale + content path.
 *   ["en","opticon"] → { locale: 'en', path: '/opticon' }
 *   ["opticon"]      → { locale: 'en', path: '/opticon' }   (default locale)
 *   undefined        → { locale: 'en', path: '/' }
 */
export function parseSlug(slug: string | undefined): { locale: SupportedLocale; path: string } {
  const segments = (slug ?? '').split('/').filter(Boolean);
  if (segments.length === 0) return { locale: DEFAULT_LOCALE, path: '/' };

  const first = segments[0].toLowerCase();
  if (isLocale(first)) {
    const rest = segments.slice(1);
    return { locale: first as SupportedLocale, path: rest.length ? `/${rest.join('/')}` : '/' };
  }
  return { locale: DEFAULT_LOCALE, path: `/${segments.join('/')}` };
}

/**
 * GraphQL selection set for HyattProposal. richText fields select `{ html }`;
 * repeating collections are string arrays of JSON (parsed in the layout).
 * Used by both the path fetch below and the preview fallback in `preview.astro`.
 */
export const HYATT_PROPOSAL_FRAGMENT = `
  ... on HyattProposal {
    accountName
    preparedFor
    wordmark
    navCtaLabel
    eyebrow
    heroHeadlineHtml { html }
    heroLedeHtml { html }
    heroPrimaryCta
    heroSecondaryCta
    heroImage
    heroImageCaption
    heroStats
    trailEyebrow
    trailHeadingHtml { html }
    trailLede
    trailCards
    marqueeItems
    teamEyebrow
    teamHeadingHtml { html }
    teamLede
    teamCards
    teamNote
    offerEyebrow
    offerHeadingHtml { html }
    offerLede
    offerPillars
    expEyebrow
    expHeadingHtml { html }
    expLede
    controlTag
    controlTitle
    controlItems
    challengerTag
    challengerTitle
    challengerItems
    expResults
    expFootnote
    stayEyebrow
    stayHeadingHtml { html }
    stayLede
    stayCities
    careEyebrow
    careHeadingHtml { html }
    careLede
    careItems
    careImage
    careImageAlt
    quoteHtml { html }
    quoteCite
    ctaEyebrow
    ctaHeadingHtml { html }
    ctaBody
    ctaKicker
    signatureInitial
    signatureName
    signatureRole
    planOptions
    formButtonLabel
    formNote
    successHeading
    successBody
    footerTagline
    footerCols
    disclaimer
    sourcesEyebrow
    sourcesHeading
    sourcesLede
    sources
    metaTitle
    metaDescription
  }
`;

/** All page-type fragments, concatenated for the path/preview queries. */
export const ALL_PAGE_FRAGMENTS = `
  ${HYATT_PROPOSAL_FRAGMENT}
`;

/** Create a Graph client — only the single key is required. */
export function createGraphClient(): GraphClient {
  return new GraphClient(import.meta.env.OPTIMIZELY_GRAPH_SINGLE_KEY);
}

/**
 * Fetch published content by URL path with all page fields, via a raw Graph
 * query. Locale is explicit so we serve the right translation rather than
 * whichever one Graph indexed first.
 */
export async function getFullContentByPath(path: string, locale: string = DEFAULT_LOCALE) {
  const client = createGraphClient();
  const normalizedPath = path.endsWith('/') ? path : path + '/';
  const localePrefixed = `/${locale}${normalizedPath}`.replace(/\/{2,}/g, '/');
  const base = import.meta.env.SITE_URL || 'https://localhost:3005';

  const query = `
    query GetContentByPath($url: String, $base: String, $locale: String) {
      _Content(
        where: {
          _metadata: {
            locale: { eq: $locale }
            url: { default: { eq: $url }, base: { eq: $base } }
          }
        }
      ) {
        items {
          _metadata { key displayName types url { default base } }
          ${ALL_PAGE_FRAGMENTS}
        }
      }
    }
  `;

  // CMS SaaS often stores url.default with the locale prefix (`/en/slug/`).
  // Older Graph indexes omit it. Try both so either host shape resolves.
  for (const url of [localePrefixed, normalizedPath]) {
    const data = await client.request(query, { url, base, locale });
    const item = data?._Content?.items?.[0];
    if (item) return item;
  }
  return null;
}

/** Fetch the published Hyatt proposal regardless of URL path. */
export async function getPublishedHyattProposal(locale: string = DEFAULT_LOCALE) {
  const client = createGraphClient();
  const query = `
    query GetHyattProposal($locale: String) {
      _Content(
        where: {
          _metadata: {
            types: { eq: "HyattProposal" }
            locale: { eq: $locale }
          }
        }
        limit: 1
      ) {
        items {
          _metadata { key displayName types url { default base } }
          ${ALL_PAGE_FRAGMENTS}
        }
      }
    }
  `;
  const data = await client.request(query, { locale });
  return data?._Content?.items?.[0] ?? null;
}

/** Fetch draft content for the CMS preview iframe. */
export async function getPreviewContent(params: PreviewParams) {
  return createGraphClient().getPreviewContent(params);
}

export type { PreviewParams };
