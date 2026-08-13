/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OPTIMIZELY_GRAPH_SINGLE_KEY: string;
  readonly OPTIMIZELY_GRAPH_URL?: string;
  readonly OPTIMIZELY_CMS_URL: string;
  readonly SITE_URL: string;
  readonly SITE_LOGO_URL?: string;
  readonly SITE_MODE?: 'airline' | 'corporate';
  readonly SITE_BRAND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
