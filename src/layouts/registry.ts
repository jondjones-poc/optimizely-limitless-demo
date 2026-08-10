/**
 * Layout registry — the single dispatch table for the site. Maps a content type
 * to the Astro layout that renders it. Both `[...slug].astro` (published) and
 * `preview.astro` (draft) resolve through here, so neither route contains a
 * per-type `if` ladder.
 *
 * This is a **single-customer** app (Hyatt), so the key is the content type
 * alone — there's no brand dimension. Adding a page type = drop a
 * `hyatt-<variant>.astro` in this folder and add one entry below.
 *
 * `fullDocument: true` marks a layout that renders its own `<html>`/`<head>`
 * and bypasses `Base.astro`; it also receives a `preview` prop in preview mode.
 */
import HyattProposalLayout from './hyatt-proposal.astro';

export type LayoutEntry = {
  component: any;
  /** renders its own `<html>`; skip the Base site shell */
  fullDocument?: boolean;
};

const REGISTRY: Record<string, LayoutEntry> = {
  HyattProposal: { component: HyattProposalLayout, fullDocument: true },
};

/**
 * Resolve the layout for a content item. `types` is the list of content-type
 * names (`_metadata.types`, plus `__typename` in preview); the first one with a
 * registry entry wins. Returns null when nothing is registered (caller shows a
 * fallback).
 */
export function resolveLayout(types: string[]): LayoutEntry | null {
  for (const t of types) {
    if (REGISTRY[t]) return REGISTRY[t];
  }
  return null;
}
