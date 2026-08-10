import { buildConfig } from '@optimizely/cms-sdk';

/**
 * CMS CLI config.
 *
 * Tab labels are deliberately account-NEUTRAL ('Calendar', 'Persuasion') rather
 * than named after the Camp Opticon worked example ('The Trail Map', 'The
 * Experiment'). These tabs show on every account's page, so an example-specific
 * label re-teaches one account's conceit to every editor. `components` globs every content-type definition, so adding a
 * type needs no manual registration here — only the SDK registry in
 * `src/lib/graph.ts`.
 *
 * Property groups are the CMS editor's field tabs. One group per section of the
 * Hyatt proposal page, in page order, so editing the page top-to-bottom in the
 * CMS matches reading it top-to-bottom on the front-end.
 */
export default buildConfig({
  components: ['./src/content-types/**/*.ts'],
  propertyGroups: [
    { key: 'hyaccount',    displayName: 'Account',              sortOrder: 10 },
    { key: 'hyhero',       displayName: 'Hero',                 sortOrder: 20 },
    { key: 'hytrail',      displayName: 'Calendar',             sortOrder: 30 },
    { key: 'hyteam',       displayName: 'Who Runs This',        sortOrder: 35 },
    { key: 'hyoffer',      displayName: 'The Offer',            sortOrder: 40 },
    { key: 'hyexperiment', displayName: 'Persuasion',           sortOrder: 50 },
    { key: 'hystay',       displayName: "Where You'll Stay",    sortOrder: 60 },
    { key: 'hycare',       displayName: 'Why Hyatt',            sortOrder: 70 },
    { key: 'hyquote',      displayName: 'Quote Strip',          sortOrder: 80 },
    { key: 'hycta',        displayName: 'Start the Conversation', sortOrder: 90 },
    { key: 'hyfooter',     displayName: 'Footer',               sortOrder: 100 },
    { key: 'hysources',    displayName: 'Sources',              sortOrder: 110 },
    { key: 'seo',          displayName: 'SEO',                  sortOrder: 120 },
  ],
});
