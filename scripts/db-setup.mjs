#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const dbUrl = process.env.DATABASE_URL || '';
const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');
const schema = isSqlite ? 'prisma/schema.local.prisma' : 'prisma/schema.prisma';

console.log('DB setup using schema:', schema);

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, env: { ...process.env }, shell: true });
  if (res.error) {
    console.error('Command failed:', res.error);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error('Command exited with code', res.status);
    process.exit(res.status || 1);
  }
}

// Ensure prisma generate and db push use the chosen schema
const prismaBin = `${process.platform === 'win32' ? 'node_modules/.bin/prisma.cmd' : 'node_modules/.bin/prisma'}`;
run(prismaBin, ['generate', '--schema', schema]);
run(prismaBin, ['db', 'push', '--schema', schema]);

// Run migration of legacy users if present
run('node', ['scripts/migrate-json-users.mjs']);
// Seed admin and vouchers
run('node', ['scripts/seed-admin.mjs']);
run('node', ['scripts/seed-vouchers.mjs']);

console.log('DB setup complete.');
