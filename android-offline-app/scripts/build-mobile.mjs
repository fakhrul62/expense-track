import { mkdir, rm, cp, symlink, access } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
const workspace = resolve('.');
const staging = resolve('build/mobile-app');
await mkdir(staging, { recursive: true });
for (const name of ['src', 'public']) {
  const target = resolve(staging, name);
  if (!target.startsWith(workspace + sep + 'build' + sep)) throw new Error('Unexpected staging path');
  await rm(target, { recursive: true, force: true });
  await cp(resolve(name), target, { recursive: true, filter: source => source !== resolve('src/app/api') });
}
for (const name of ['package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs']) await cp(resolve(name), resolve(staging, name));
try { await access(resolve(staging, 'node_modules')); }
catch { await symlink(resolve('node_modules'), resolve(staging, 'node_modules'), 'junction'); }
const result = spawnSync(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'build'], { cwd: staging, stdio: 'inherit', env: { ...process.env, ANDROID_BUILD: 'true' } });
process.exitCode = result.status ?? 1;
if (process.exitCode === 0) {
  const target = resolve('out');
  if (target !== workspace + sep + 'out') throw new Error('Unexpected export path');
  await rm(target, { recursive: true, force: true });
  await cp(resolve(staging, 'out'), target, { recursive: true });
}
