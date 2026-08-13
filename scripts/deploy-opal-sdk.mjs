#!/usr/bin/env node
/**
 * Deploy opal/ exports via @optimizely-opal/opal-agent-sdk.
 * The repo's deploy-opal.mjs shells out to internal `opal-cli`; this uses the
 * public SDK + OPAL_PAT instead.
 *
 *   OPAL_PAT=… node scripts/deploy-opal-sdk.mjs --dry
 *   OPAL_PAT=… node scripts/deploy-opal-sdk.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpalClient, PatAuth } from '@optimizely-opal/opal-agent-sdk';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const PAT = process.env.OPAL_PAT;
if (!PAT) {
  console.error('Missing OPAL_PAT.');
  console.error('Create one in Opal → Settings → Developer → Personal Access Tokens,');
  console.error('then:  OPAL_PAT=… node scripts/deploy-opal-sdk.mjs --dry');
  process.exit(1);
}

const SKILL_STRIP = [
  'product_sku', 'instance_id', 'links', 'skill_guid', 'version_guid',
  'created_at', 'updated_at', 'created_by', 'updated_by', 'customer_id',
  'opal_instance_id', 'user_id',
];

const glob = (dir) => {
  const d = path.join(ROOT, 'opal', dir);
  return fs.existsSync(d)
    ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => path.join(d, f))
    : [];
};

const rel = (f) => path.relative(ROOT, f);

let failed = 0;
const client = new OpalClient({ auth: new PatAuth(PAT) });

try {
  const existingHandles = new Set();
  for await (const skill of client.skills.iter({ scope: 'org', includeDeactivated: true })) {
    if (skill.mentionHandle) existingHandles.add(skill.mentionHandle);
  }

  for (const f of glob('skills')) {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    const skill = { ...(Array.isArray(raw) ? raw[0] : raw) };
    for (const k of SKILL_STRIP) delete skill[k];
    const handle = skill.mention_handle;
    if (existingHandles.has(handle)) {
      console.log(`skill   ${String(handle).padEnd(26)} exists — skipped`);
      continue;
    }
    if (DRY) {
      console.log(`skill   ${String(handle).padEnd(26)} would import from ${rel(f)}`);
      continue;
    }
    try {
      const r = await client.skills.import(skill, {
        scope: skill.skill_type === 'personal' ? 'personal' : 'org',
        updateIfExists: false,
      });
      if (r.error) {
        console.log(`skill   ${String(handle).padEnd(26)} FAILED ${r.error}`);
        failed++;
      } else {
        console.log(`skill   ${String(handle).padEnd(26)} ${r.created ? 'created' : 'imported'} ${r.skillGuid}`);
        existingHandles.add(handle);
      }
    } catch (e) {
      const msg = e.message || String(e);
      if (/409|already taken|already exists/i.test(msg)) {
        console.log(`skill   ${String(handle).padEnd(26)} already deployed — skipped`);
      } else {
        console.log(`skill   ${String(handle).padEnd(26)} FAILED ${msg.slice(0, 200)}`);
        failed++;
      }
    }
  }

  for (const f of glob('agents')) {
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    const id = doc.agent_id || doc.name || rel(f);
    if (DRY) {
      console.log(`agent   ${String(id).padEnd(26)} would import from ${rel(f)}`);
      continue;
    }
    try {
      const r = await client.agents.import(doc, { type: 'specialized', updateIfExists: true });
      if (r.error) {
        console.log(`agent   ${String(id).padEnd(26)} FAILED ${r.error}`);
        failed++;
      } else {
        console.log(`agent   ${String(id).padEnd(26)} ${r.created ? 'created' : 'updated'} ${r.agentId}`);
      }
    } catch (e) {
      console.log(`agent   ${String(id).padEnd(26)} FAILED ${(e.message || String(e)).slice(0, 200)}`);
      failed++;
    }
  }

  for (const f of glob('workflows')) {
    const env = JSON.parse(fs.readFileSync(f, 'utf8'));
    const root = env.agents?.[env.rootAgentId];
    if (!root) {
      console.log(`workflow ${rel(f)} FAILED: no agents[rootAgentId]`);
      failed++;
      continue;
    }
    const id = root.agent_id || root.name || rel(f);
    if (DRY) {
      console.log(`workflow ${String(id).padEnd(25)} would import from ${rel(f)}`);
      continue;
    }
    try {
      const r = await client.agents.import(root, { type: 'workflow', updateIfExists: true });
      if (r.error) {
        console.log(`workflow ${String(id).padEnd(25)} FAILED ${r.error}`);
        failed++;
      } else {
        console.log(`workflow ${String(id).padEnd(25)} ${r.created ? 'created' : 'updated'} ${r.agentId}`);
      }
    } catch (e) {
      console.log(`workflow ${String(id).padEnd(25)} FAILED ${(e.message || String(e)).slice(0, 200)}`);
      failed++;
    }
  }

  if (!DRY && !failed) console.log('\nDone. Open Opal and look for @hyatt_proposal_planner, @hyatt_proposal_builder, and wf_hyatt_proposal.');
} finally {
  await client.close();
}

process.exit(failed ? 1 : 0);
