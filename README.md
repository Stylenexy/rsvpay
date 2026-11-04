# Amplop Balas

**A wedding gift that remembers, and gives back.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Network](https://img.shields.io/badge/NEAR-testnet-00BFFF)](https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet)

At Indonesian weddings, guests give money in envelopes (*amplop*) and families keep a notebook of who gave what, so they can return the favour at the guest's own celebration years later. The notebook gets lost. Amplop Balas makes that notebook an NFT that holds its own money and remembers.

Tracks: **NFTs That Do Something** + **Open Innovation**. Built at NEAR HACKATHON, November 2026. Testnet only, play money, not audited.

Also by the same builder: **Mintless** (*Kota Tanpa Cetak Uang*, track Games With Real Economies), a separate project with separate code. It is named here because the rules ask each README to name the other.

| | |
|---|---|
| Live demo | https://amplop-balas.vercel.app |
| Contract (testnet) | [`amplop-c-mvznhnlx.testnet`](https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet), zero access keys |
| Docs | [Architecture](docs/ARCHITECTURE.md) · [Threat model](docs/THREAT-MODEL.md) · [Design](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) · [Evidence](docs/evidence/) |

## What it does

1. **A host opens a hajatan** (celebration). The contract mints one NFT, the *amplop*, to the host. The host fixes a *reply seed* of 0–10%, which can never change.
2. **A guest scans a QR and gives.** No wallet to install. The gift becomes an entry in the NFT: who, how much, the wish, when. The seed part (say 5%) stays locked in that guest's name. The rest is free for the host to withdraw.
3. **Years later the guest hosts their own hajatan.** The old amplop rings: *"Budi gave Rp500.000. Seed Rp25.000 is ready. Add Rp475.000?"* One tap releases the seed plus the top-up into Budi's amplop as a new entry linked to the old one. Saying "later" changes nothing.

Each reply is itself an entry with its own seed, so the chain of giving back can continue between two families for decades.

![The host's book when an old guest hosts: the amplop rings](docs/evidence/5-amplop-rings.png)

## Why an NFT, not a database

- **The cycle outlives apps.** Giving back takes 5 to 20 years, longer than almost any app that records envelopes. This book belongs to the family, not to a company.
- **The money is held by the token, not by us.** There is no admin and no owner function, and the contract has no access keys.
- **The rights move with the NFT.** Pass the amplop to a child and the money, the book and the promises go with it. The previous holder is locked out.
- **The seed is a promise kept by code.** It can only ever go to the guest who gave it. Nobody can quietly withdraw it.

## Try it

No install. Works on a phone. Amounts in rupiah use a demo rate, marked on screen (1 NEAR = Rp500.000); testnet NEAR has no price. The app speaks Indonesian: *Coba jadi tamu* = try as a guest, *Buka hajatan* = open a celebration.

| Do | See |
|---|---|
| Open https://amplop-balas.vercel.app, tap **Coba jadi tamu** | The guest page of a demo amplop with gifts already in it |
| Type a name, tap the round button (or slide it) | About 10 seconds later the card shrinks into a star, and a link to the real transaction appears |
| On a laptop open https://amplop-balas.vercel.app/#/buka, type your name, tap **Buka amplop** | Your own amplop: a sky, one star per gift, a QR for guests |
| Scan that QR with a phone and give | The laptop updates by itself within seconds: new star, new row, "+Rp… baru saja" |
| Tap **Orang lain** on the laptop | Names and amounts disappear; only the holder sees the book |
| On the phone open `/#/buka` and open a hajatan with the same account you gave from | The laptop shows **Amplop berbunyi** (the amplop rings). Tap **Kirim balasan**, and the reply lands in the phone's amplop |
| Tap **Tarik dana bebas** on the laptop | Free money arrives in the host account; the seeds of unreplied guests stay locked |

Accounts on this demo are throwaway testnet accounts made by your browser through NEAR's public testnet helper. No secret ships with the site.

## Run it from zero

Needs Node 22+ and, for the contract, Rust. On Windows set `AWS_LC_SYS_PREBUILT_NASM=1` before cargo.

```bash
cd contracts && cargo test
```
See `test result: ok. 45 passed`.

```bash
cd frontend && npm ci && npm test
```
See `21 passed | 1 skipped`. The skipped one is the first live check below.

```bash
cd frontend && npm run dev
```
See a local site on http://localhost:5173, talking to the same testnet contract. Add `?mock` before the `#` to work without the network.

Live checks. These use the network and make throwaway testnet accounts through the public helper, which rate-limits, so run them a minute apart.

```bash
cd frontend && LIVE=1 npx vitest run src/chain/near.live.test.ts
```
See `1 passed`: the web client opens, gives, rings, replies and withdraws on testnet.

```bash
cd scripts && npm ci && node attacks.mjs
```
See 12 `PASS` lines, one per attack, against the deployed contract. Report: [`docs/evidence/attacks-report.txt`](docs/evidence/attacks-report.txt).

```bash
cd frontend && node e2e/alur.e2e.mjs
```
See 13 `PASS` lines: the whole story on the deployed site in a real browser engine, the guest on a 360 px touch screen. Set `CHROME` to your browser's path if it is not the Windows default. Report and screenshots: [`docs/evidence/`](docs/evidence/).

Rebuild the wasm (optional, the deployed contract already matches this source):

```bash
rustup target add wasm32-unknown-unknown
cd contracts && cargo build --target wasm32-unknown-unknown --release
```
`.cargo/config.toml` adds `--cfg near`. Without it every on-chain panic loses its message.

## How control moves when the NFT is transferred

The money lives inside the contract, booked per token id, not in anyone's account. Every money method asks one question: *who holds this NFT right now?*

- `withdraw` and `reciprocate` call `require_holder`, which reads the owner from NEP-171 state at call time. No owner is stored anywhere else.
- On `nft_transfer` the balance, the locked seeds and every entry stay with the token id, so they move with it automatically. The new holder inherits both the money and the promises. The old holder is refused from that block on.
- During `nft_transfer_call` a lock blocks `withdraw` and `reciprocate`, so a buyer cannot drain the amplop inside `nft_on_transfer` while the sale can still revert. After 300 blocks the lock goes stale, so a receiver cannot freeze the amplop forever.
- A failed payout goes back into the amplop, not to the void.
- The contract account has no access keys. There is no admin, no upgrade and no pause, for us or anyone.

**Before buying an amplop**, read `hajatan(token_id)`: the seller may withdraw free money up to the moment of sale. Seeds cannot be withdrawn by anyone; they only leave as a reply to the guest who gave them.

## What we attacked

[17 attacks](docs/THREAT-MODEL.md), each with its defence and the test that proves it. 12 checks ran for real against the deployed contract on testnet, and each counted only if the call failed **and** the state did not change. They include stealing a seed, redirecting a reply, replying twice, an old owner acting after a sale, and forging the payout callback.

## What is not solved

Written down so nobody has to discover it. Full list: [threat model](docs/THREAT-MODEL.md#not-defended), [roadmap](docs/ROADMAP.md).

- **Amounts are public on chain.** The app hides names and amounts from non-holders, but that is a screen, not secrecy.
- **The guest's key lives in the browser.** Clear the browser or change phones and that account is gone, so the old amplop can no longer find you. This is the biggest gap in the product: the promise runs for years, and a browser key does not. Google or email login through NEAR Auth is the fix, but its shared testnet client only accepts `http://localhost:3000` as a callback (checked 4 November 2026), so a public site needs approved credentials we do not have.
- **"No wallet" still means someone funds the guest.** Here the testnet helper does. A real product needs rupiah in through QRIS, a stablecoin, and gas sponsored by a relayer. None of that is built.
- **Rupiah is a demo rate,** not a market price.
- **Not audited, and no independent users yet.** Every test above was run by the builder.

## Repository

```text
contracts/   Rust contract and its unit tests
frontend/    React site, deployed to Vercel; e2e/ drives it in a real browser
scripts/     Testnet scripts: attacks, full cycle, demo seed
docs/        Architecture, threat model, design, roadmap, evidence
```

There is no `backend/` on purpose; see [Architecture](docs/ARCHITECTURE.md). See also [CONTRIBUTING](CONTRIBUTING.md) and [SECURITY](SECURITY.md).

## Tools and libraries

- Contract: Rust, `near-sdk` 5.30.0, `near-contract-standards`.
- Web: React 19, Vite 8, TypeScript, `near-api-js` 7.4.0, `qrcode`. Fonts: Gloock, Karla, DM Mono from Google Fonts.
- Tests: `cargo test`, Vitest, `playwright-core` driving an installed Chrome.
- Testnet RPC: FastNEAR. Accounts: NEAR testnet helper. Hosting: Vercel.
- AI: code and documentation were written with an AI coding assistant (Claude Code), and several AI chat assistants were consulted when choosing the idea. Listed here as the hackathon rules ask. Test counts and attack results in this README come from the commands above.

## Team

Dex Bennett (solo), Information Systems student, Universitas Kristen Duta Wacana, Yogyakarta.

## License

MIT, see [LICENSE](LICENSE).
