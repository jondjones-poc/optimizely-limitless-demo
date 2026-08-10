/**
 * Shared helpers for the Hyatt layouts.
 *
 * Repeating content is stored in the CMS as arrays of JSON strings (one object
 * per item). `parseItems` turns that back into objects, tolerating an
 * already-parsed object or a malformed entry rather than crashing the page.
 */
export function parseItems<T = Record<string, any>>(arr: unknown): T[] {
  if (!Array.isArray(arr)) return [];
  const out: T[] = [];
  for (const raw of arr) {
    if (raw && typeof raw === 'object') {
      out.push(raw as T);
      continue;
    }
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as T);
    } catch {
      // leave malformed entries out
    }
  }
  return out;
}

/** Plain string arrays (bullets, marquee phrases) — drop empties. */
export function strings(arr: unknown): string[] {
  return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string' && !!s.trim()) : [];
}

/**
 * Inline citation markers. Authors write `[^n]` right after a sourced figure;
 * this rewrites it to a superscript link that jumps to `#source-n` in the
 * Sources section. A `[^n]` with no matching source still renders (as a dead
 * anchor), so only emit markers you also list in `sources`.
 */
export function cite(html: string): string {
  if (!html) return '';
  return html.replace(
    /\[\^(\d{1,3})\]/g,
    (_m, n) => `<sup class="hy-cite"><a href="#source-${n}" title="Jump to source ${n}">${n}</a></sup>`,
  );
}

/** richText fields come back as `{ html }`; tolerate plain strings. Expands `[^n]`. */
export function richHtml(field: any): string {
  if (!field) return '';
  return cite(typeof field === 'string' ? field : field.html ?? '');
}

/** A single citation behind the page. `group` splits the Sources list. */
export type Source = {
  n?: number;
  label: string;
  url?: string;
  /** 'account' = research on the prospect · 'hyatt' = Hyatt's own facts */
  group?: 'account' | 'hyatt' | string;
  publisher?: string;
  date?: string;
};

/** Display host for a source URL: `https://www.hyatt.com/leverage` → `hyatt.com`. */
export function sourceDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
