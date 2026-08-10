#!/usr/bin/env node
/**
 * Deploy this repo's Opal exports via `opal-cli`, in dependency order:
 * skills → agents → workflow.
 *
 * It exists because the export and import shapes don't match, and getting that
 * wrong costs a confusing 422 or "Missing required field: schema_version":
 *
 *  - A **skill** export is a JSON *array*, but `skill import` demands an object,
 *    so we use `skill create` on element 0. That endpoint also 422s on
 *    `product_sku` / `instance_id` (it stores them as `[]` but validates them as
 *    strings), so those and the server-assigned fields are stripped.
 *  - A **workflow** export is an envelope `{rootAgentId, agents:{…}}` whose
 *    sub-agent entries are `{error, agent_id}` stubs. Importing it whole fails;
 *    `--tree` doesn't help. We import `agents[rootAgentId]` alone, and the
 *    sub-agents resolve by slug from `specialized_agents_required`.
 *  - Agents import as-is.
 *
 * Usage:
 *   node scripts/deploy-opal.mjs --dry     # validate only, writes nothing
 *   node scripts/deploy-opal.mjs           # deploy
 *   node scripts/deploy-opal.mjs --only skills
 *
 * Re-running is safe: skills that already exist are reported, not duplicated
 * (delete first if you need to replace one), and agents/workflows are updated
 * in place with --update-if-exists.
 *
 * ponytail: shells out to opal-cli rather than talking to the API — the CLI
 * already owns auth, and this stays a thin ordering wrapper.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const only = process.argv[process.argv.indexOf('--only') + 1];
const want = (kind) => !process.argv.includes('--only') || only === kind;

/** Fields the skill create endpoint either rejects or assigns itself. */
const SKILL_STRIP = ['product_sku', 'instance_id', 'links', 'skill_guid', 'version_guid',
  'created_at', 'updated_at', 'created_by', 'updated_by', 'customer_id', 'opal_instance_id', 'user_id'];

const opal = (args) => {
  try {
    return { ok: true, out: execFileSync('opal-cli', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
};

const tmp = (name, obj) => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'opal-deploy-')), name);
  fs.writeFileSync(f, JSON.stringify(obj, null, 1));
  return f;
};

const glob = (dir) => {
  const d = path.join(ROOT, 'opal', dir);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => path.join(d, f)) : [];
};

const rel = (f) => path.relative(ROOT, f);

/**
 * `agent update` addresses agents by GUID, not by the `agent_id` slug — and
 * `agent list` doesn't return the slug at all, only `agentId` (the GUID) and the
 * display `name`. Our export files carry that same `name`, so match on it. Note
 * the list response is a bare JSON array, not `{items:[…]}`.
 */
let agentIndex = null;
const resolveGuid = (displayName) => {
  if (agentIndex === null) {
    agentIndex = new Map();
    const l = opal(['agent', 'list', '--all', '--json']);
    try {
      const parsed = JSON.parse(l.out);
      for (const a of Array.isArray(parsed) ? parsed : parsed.items ?? []) {
        if (a.name && a.agentId) agentIndex.set(a.name, a.agentId);
      }
    } catch { /* leave unresolved; caller reports it */ }
  }
  return agentIndex.get(displayName);
};

let failed = 0;
let existingHandles = null;   // lazily fetched once, see the skills block

if (want('skills')) {
  for (const f of glob('skills')) {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    const skill = { ...(Array.isArray(raw) ? raw[0] : raw) };
    for (const k of SKILL_STRIP) delete skill[k];
    const handle = skill.mention_handle;

    // `skill create` has no --validate, so a dry run stops at the shape check.
    if (DRY) { console.log(`skill   ${handle.padEnd(26)} would create from ${rel(f)}`); continue; }

    // `skill list --search` matches the TITLE, not the mention handle, so list
    // everything once and match on mentionHandle — otherwise an existing skill
    // looks absent and the create comes back 409 "already taken".
    if (existingHandles === null) {
      const l = opal(['skill', 'list', '--scope', 'org', '--all', '--json']);
      try {
        const parsed = JSON.parse(l.out);
        existingHandles = new Set((parsed.items ?? parsed).map((s) => s.mentionHandle).filter(Boolean));
      } catch { existingHandles = new Set(); }
    }
    if (existingHandles.has(handle)) {
      console.log(`skill   ${handle.padEnd(26)} exists — skipped (delete it first to replace)`);
      continue;
    }
    const r = opal(['skill', 'create', '-f', tmp('skill.json', skill), '--scope', skill.skill_type || 'org', '--json']);
    const guid = r.ok && (r.out.match(/"skill_guid":"([^"]+)"/) || [])[1];
    // A 409 means the handle is taken, i.e. already deployed — same outcome as
    // the skip above, so don't count it as a failure.
    const taken = !r.ok && /409|already taken/.test(r.out);
    console.log(`skill   ${handle.padEnd(26)} ${r.ok ? 'created ' + guid : taken ? 'already deployed — skipped' : 'FAILED ' + r.out.slice(0, 200)}`);
    if (!r.ok && !taken) failed++;
  }
}

if (want('agents')) {
  for (const f of glob('agents')) {
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    const args = ['agent', 'import', '-f', f, '--update-if-exists', '--json'];
    if (DRY) args.push('--validate');
    const r = opal(args);
    const id = (r.out.match(/"agentId":"([^"]+)"/) || [])[1] || '?';
    console.log(`agent   ${id.padEnd(26)} ${r.ok ? (DRY ? 'valid' : 'imported') : 'FAILED ' + r.out.slice(0, 200)}`);
    if (!r.ok) { failed++; continue; }
    if (DRY) continue;

    // `agent import` silently DROPS parameter `default`s (they come back null),
    // which used to mean setting them by hand in the Opal UI. `agent update`
    // does persist them, so replay the defaults straight after the import.
    const defaults = (doc.parameters || []).filter((p) => p.default !== null && p.default !== undefined);
    if (!defaults.length) continue;
    const guid = resolveGuid(doc.name);
    if (!guid) { console.log(`        ${''.padEnd(26)} could not resolve GUID for ${doc.name} — set defaults in the UI`); failed++; continue; }
    const u = opal(['agent', 'update', guid, '-f', tmp('params.json', { parameters: doc.parameters }), '--json']);
    console.log(`        ${''.padEnd(26)} ${u.ok ? 'defaults set: ' + defaults.map((d) => d.name).join(', ') : 'FAILED setting defaults ' + u.out.slice(0, 160)}`);
    if (!u.ok) failed++;
  }
}

if (want('workflows')) {
  for (const f of glob('workflows')) {
    const env = JSON.parse(fs.readFileSync(f, 'utf8'));
    const root = env.agents?.[env.rootAgentId];
    if (!root) { console.log(`workflow ${rel(f)} FAILED: no agents[rootAgentId]`); failed++; continue; }
    const args = ['workflow', 'import', '-f', tmp('wf.json', root), '--update-if-exists', '--json'];
    if (DRY) args.push('--validate');
    const r = opal(args);
    console.log(`workflow ${(root.agent_id || '?').padEnd(25)} ${r.ok ? (DRY ? 'valid' : 'imported') : 'FAILED ' + r.out.slice(0, 200)}`);
    if (!r.ok) failed++;
  }
}

if (!DRY && !failed) console.log('\nDone. Parameter defaults were replayed via `agent update` — nothing left to set by hand.');
process.exit(failed ? 1 : 0);
