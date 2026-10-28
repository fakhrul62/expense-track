import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { OAuth2Client } from 'google-auth-library';

await mkdir('.tools', { recursive: true });
const source = await readFile('src/lib/google-server.ts', 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const target = resolve('.tools/google-verifier-test.mjs');
await writeFile(target, output);
const { verifyGoogleIdentity } = await import(pathToFileURL(target).href);
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
// Test-only certificate source; production uses Google's rotating public keys.
const verifier = new OAuth2Client();
verifier.getFederatedSignonCertsAsync = async () => ({ certs: { test: publicKey.export({ type: 'spki', format: 'pem' }) }, format: 'PEM' });
const audience = 'test.apps.googleusercontent.com';
const nonce = 'a'.repeat(43);
const seconds = Math.floor(Date.now() / 1000);
const claims = { aud: audience, iss: 'https://accounts.google.com', iat: seconds - 5, exp: seconds + 3600, sub: '123456789', email: 'person@gmail.com', email_verified: true, name: 'Person', nonce };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(overrides = {}, signingKey = privateKey) {
  const content = `${encode({ alg: 'RS256', kid: 'test' })}.${encode({ ...claims, ...overrides })}`;
  return `${content}.${sign('RSA-SHA256', Buffer.from(content), signingKey).toString('base64url')}`;
}
assert.deepEqual(await verifyGoogleIdentity(token(), nonce, audience, verifier), { subject: claims.sub, email: claims.email, name: 'Person', authoritativeEmail: true });
for (const overrides of [{ aud: 'other-client' }, { iss: 'https://attacker.example' }, { exp: seconds - 3600, iat: seconds - 7200 }, { email_verified: false }, { nonce: 'wrong' }, { sub: '' }, { email: 'invalid' }]) {
  await assert.rejects(verifyGoogleIdentity(token(overrides), nonce, audience, verifier));
}
await assert.rejects(verifyGoogleIdentity(token({}, generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey), nonce, audience, verifier));
const thirdParty = await verifyGoogleIdentity(token({ email: 'person@example.com' }), nonce, audience, verifier);
assert.equal(thirdParty.authoritativeEmail, false);
const workspace = await verifyGoogleIdentity(token({ email: 'person@example.com', hd: 'example.com' }), nonce, audience, verifier);
assert.equal(workspace.authoritativeEmail, true);
console.log('PASS: signed Google token verification, audience, issuer, expiry, nonce, verified email, signature rejection and safe email-link policy');
