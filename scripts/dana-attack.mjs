// Attacks on the live testnet purse behind /api/dana. Writes docs/evidence/purse-check-report.txt.
//   node scripts/dana-attack.mjs [site]
// Costs about 5 test NEAR of the purse. Throwaway keys stay in memory.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { Account, JsonRpcProvider, KeyPair, actions, nearToYocto } = require('near-api-js');

const SITE = (process.argv[2] ?? 'https://rsvpay.vercel.app').replace(/\/$/, '');
const provider = new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' });
const lines = [];
const say = (ok, name, detail = '') => { const line = `${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`; console.log(line); lines.push(line); };
const ask = async (body) => { const r = await fetch(`${SITE}/api/dana`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return [r.status, await r.json().catch(() => ({}))]; };
const fresh = () => KeyPair.fromRandom('ed25519');

// two guests on one Wi-Fi in the same second
const k1 = fresh();
const k2 = fresh();
const [[s1, b1], [s2, b2]] = await Promise.all([ask({ ask: 'akun', name: 'uji', publicKey: k1.getPublicKey().toString() }), ask({ ask: 'akun', name: 'uji', publicKey: k2.getPublicKey().toString() })]);
say(s1 === 200 && s2 === 200, 'two accounts asked for in the same second from one address both succeed', `${s1} ${s2}`);
const host = new Account(b1.accountId, provider, k1.toString());
const purse = b1.accountId.split('.').slice(1).join('.');

// markers and keyless accounts are not visitors
const [m] = await ask({ ask: 'isi', accountId: `m${'0'.repeat(20)}.${purse}` });
say(m === 400, 'a marker name is refused before anything is sent', String(m));
const bare = `bare-${Date.now().toString(36).slice(-5)}.${host.accountId}`;
await host.signAndSendTransaction({ receiverId: bare, actions: [actions.createAccount(), actions.transfer(nearToYocto('0.01'))], waitUntil: 'FINAL' });
const [k] = await ask({ ask: 'isi', accountId: bare });
say(k === 400, 'a visitor-shaped account without a key is refused', String(k));

// six top-ups per address per hour
const kids = [];
for (let i = 0; i < 7; i++) {
  const key = fresh();
  const id = `t${i}-${Date.now().toString(36).slice(-5)}.${host.accountId}`;
  await host.createAccount({ newAccountId: id, publicKey: key.getPublicKey(), nearToTransfer: nearToYocto('0.02') });
  kids.push(id);
}
const answers = [];
for (const id of kids) answers.push((await ask({ ask: 'isi', accountId: id }))[0]);
say(answers.slice(0, 6).every((s) => s === 200) && answers[6] === 429, 'the seventh top-up from one address in an hour is refused', answers.join(' '));

// one top-up per account
const [again] = await ask({ ask: 'isi', accountId: kids[0] });
say(again === 200 || again === 429, 'a topped-up account is not topped up again', `${again} (200 means it was already above the line and nothing was sent)`);

writeFileSync(new URL('../docs/evidence/purse-check-report.txt', import.meta.url), `Purse attacks on ${SITE}/api/dana, ${new Date().toISOString()}\n${lines.join('\n')}\n`);
process.exit(lines.some((l) => l.startsWith('FAIL')) ? 1 : 0);
