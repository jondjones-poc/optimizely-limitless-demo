import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

/**
 * Adapter selection — Vercel and Netlify are both supported; the host tells us
 * which one it is. Vercel sets `VERCEL=1` in its build environment, so deploying
 * there needs no config change. Everything else builds for Netlify, per
 * `netlify.toml`. Force either one locally with `DEPLOY_TARGET=vercel|netlify`.
 *
 * The adapter used to be skipped for `astro dev`, because the Netlify dev plugin
 * resolved `netlify.toml`'s `base = "platform/app"` relative to the app folder
 * and crashed. The app is now the repo root with no `base` at all, so that
 * conflict is gone and the adapter stays attached in dev too (verified).
 */
const target = process.env.DEPLOY_TARGET ?? (process.env.VERCEL ? 'vercel' : 'netlify');

export default defineConfig({
  output: 'server',
  adapter: target === 'vercel' ? vercel() : netlify(),
  server: {
    /**
     * 3005 is not just a preference — it's the base URL of the CMS site this app
     * renders (`SITE_URL`, and `url.base` on every content item in Graph). Serving
     * on any other port means preview URLs and path queries point somewhere the
     * dev server isn't. So `strictPort` below makes a busy 3005 a hard failure:
     * Vite would otherwise increment to 3006/3007 and hand you a server that
     * looks fine and resolves no content. Free the port instead:
     *   lsof -ti:3005 | xargs -r kill -9
     */
    port: 3005,
  },
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Fail rather than fall back to the next free port — see `server.port` above.
      strictPort: true,
    },
  },
});
