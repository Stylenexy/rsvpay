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
| Standard | NEP-171, NEP-177, NEP-181 (`near-sdk` 5.30.0) |
| Code on chain | `4TwL5AiugAkZSC3UEzpRyqcQdzhGK35vLLrzrTPGEe8U`, equal to the hash of a release build of this source |
| Tests | 45 Rust, 64 web, 12 live attacks, 13 browser steps, and the one-button story run on the live site in 29.5 s and 60.9 s, depending on the public testnet ([reports](docs/evidence/)) |
| Docs | [Architecture](docs/ARCHITECTURE.md) · [Threat model](docs/THREAT-MODEL.md) · [Design](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) · [Evidence](docs/evidence/) |

## Try the whole story on one device

Open https://amplop-balas.vercel.app/#/coba, or click **Try the whole story** on the landing page. The route starts immediately. No account selection or second device is needed.

The browser requests one throwaway account for Siti from NEAR's public testnet helper. Siti funds Budi's sub-account from her own test balance. It then opens Siti's wedding, sends Budi's gift, advances the story date by two years and opens Budi's celebration. The chain clock is unchanged. The envelope stops at the ring until you click **Give back to Budi**.

Each completed transaction has a receipt link and a measured duration. The end shows elapsed time including your pause, plus the sum of measured steps. The target is 60 seconds; live checks took 29.5 s and 60.9 s including the pause, the second one just over target, see [coba-e2e-report.txt](docs/evidence/coba-e2e-report.txt). Network latency and helper availability affect it.

If the helper refuses the request, the page says so and offers **View recorded run**. This is explicitly a past run from 3 November 2026, with the four hashes in [measured-testnet.txt](docs/evidence/measured-testnet.txt). That evidence contains opening, giving, replying and withdrawing; it does not contain Budi's opening receipt.

To inspect the fixed deployment's keys:

```bash
curl -s https://test.rpc.fastnear.com -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"view_access_key_list","finality":"final","account_id":"amplop-c-mvznhnlx.testnet"}}'
```

The read-only check on 5 November 2026 (Asia/Jakarta) returned `"keys":[]`.

## Track requirements and where to check them

Track **NFTs That Do Something**, from its [official prompt](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/10-nfts.md). Open Innovation has no written requirements.

| Requirement | Status | Check it |
|---|---|---|
| NEP-171 contract plus logic that ties each token to its money | Done, with one difference: the money is booked per token id inside one keyless contract, not in a sub-account per token | [`contracts/src/lib.rs`](contracts/src/lib.rs), [how control moves](#how-control-moves-when-the-nft-is-transferred) |
| README explains how control passes and what stops the old owner | Done | [How control moves](#how-control-moves-when-the-nft-is-transferred); test `old_owner_cannot_withdraw_after_transfer`; live attack L9 |
| Gated page only current holders can open | Done at screen level: the book is hidden from anyone but the holder, while amounts stay public on chain | Steps E6b and E7 in [`e2e-report.txt`](docs/evidence/e2e-report.txt) |
| History per NFT: earned, paid out, who held it | Implemented with partial-source disclosure. Gifts and linked replies come from chain views; payouts and holder changes come from successful transaction receipts. The public indexer currently returns no rows for this contract | [`history.ts`](frontend/src/chain/history.ts), book history, [source checks](docs/evidence/history-source-check.txt) |
| Tests for the transfer path, including a sale in the middle of a payout | Done | Tests `sale_during_a_payout_in_flight_keeps_every_coin_with_the_token`, `withdraw_blocked_while_sale_settles`, `sale_reverted_by_receiver_returns_amplop_and_unlocks` |
| Threat model: every way a seller could keep the money | Done | [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) |

## What it does

1. **A host opens a hajatan** (celebration). The contract mints one NFT, the *amplop*, to the host. The host fixes a *reply seed* of 0–10%, which can never change.
2. **A guest scans a QR and gives.** No wallet to install. The gift becomes an entry in the NFT: who, how much, the wish, when. The seed part (say 5%) stays locked in that guest's name. The rest is free for the host to withdraw.
3. **Years later the guest hosts their own hajatan.** The old amplop rings: *"Budi gave Rp500.000. Seed Rp25.000 is ready. Add Rp475.000?"* One tap releases the seed plus the top-up into Budi's amplop as a new entry linked to the old one. Saying "later" changes nothing.

Each reply is itself an entry with its own seed, so the chain of giving back can continue between two families for decades.

![The host's book when an old guest hosts: the amplop rings](docs/evidence/5-amplop-rings.png)

## Why an NFT, not a database

| Claim | Proof |
|---|---|
| **The cycle outlives apps.** Giving back takes 5 to 20 years. This book belongs to the family, not to a company. | The book is contract state, readable with `hajatan(token_id)` without our site |
| **The money is held by the token, not by us.** No admin, no owner function, no access keys. | Live attack L1: 0 keys |
| **The rights move with the NFT.** The money, the book and the promises travel with it. The previous holder is locked out. | Step A11 in [`full-cycle-report.txt`](docs/evidence/full-cycle-report.txt), test `old_owner_cannot_withdraw_after_transfer`, live attack L9 |
| **The seed is a promise kept by code.** It can only go to the guest who gave it. | Tests `withdraw_pays_only_free_money_and_never_touches_seeds`, `reply_cannot_be_redirected_to_someone_else`; live attacks L6, L11 |

## Why NEAR

- **A contract can give up every key.** The account behind this contract has none, so the rules cannot change. That is what makes a 20-year promise believable.
- **Whoever adds data pays for its storage.** Each gift covers the storage of its own entry, so a long guest list does not fall on the host, and spam pays for itself.
- **Accounts have names.** A guest is `budi-….testnet`, not a hex string, which matters when a family reads its own book.
- **The missing pieces are native.** Google login (NEAR Auth) and sponsored gas (NEP-366) are the next steps on the [roadmap](docs/ROADMAP.md), not add-ons from elsewhere.

## Try it

Run the frontend locally as described below. The app uses only the fixed testnet deployment `amplop-c-mvznhnlx.testnet`. It offers English, Indonesian, Chinese, Korean, Japanese and Vietnamese. Rupiah amounts use a labelled display rate of 1 NEAR = Rp500,000; testnet NEAR has no market price.

| Do | See |
|---|---|
| Click **Try the whole story** on the landing page | A live timeline on `#/coba`, with both families on the same device |
| Wait for Siti's envelope to ring | Budi's original gift, the part kept for him and the amount Siti will add |
| Click **Give back to Budi** | A real reply into Budi's envelope, its transaction link and the measured elapsed time |
| Click **Open Budi's book** | The browser switches to Budi, the current holder, and opens his book |
| Read **The envelope's history** | Incoming gifts, linked replies, current holder and any verified payouts or holder changes. Missing history is labelled explicitly |
| Click **Pass the envelope on**, enter an existing testnet account and read the confirmation | The book, remaining balance and promises will all move. The old holder loses the book's controls |
| Confirm the named recipient | A real `nft_transfer` with one yoctoNEAR, a transaction link and the new holder. Switching to that holder on this device opens the inherited book |

The ordinary `#/buka`, `#/beri/<id>` and `#/buku/<id>` pages remain available for a two-device walkthrough: open a celebration, share its QR, give from the second device, then open the guest's own celebration and reply from the first device.

Accounts are throwaway testnet accounts created by the browser. Their keys stay on that device. There is no server key. Clearing browser storage removes access to those accounts.

History checks the public Nearblocks testnet API without a key and verifies indexed transaction logs against testnet RPC receipts. The scan is limited to the latest 100 indexed contract transactions and labels truncated or missing coverage. Public receipt references for transactions made on this device are also saved locally and verified through RPC when read again. Failed payouts are shown as refunds, never as money paid out. This is not a complete archive when the public index is missing data.

## Run it from zero

Needs Node 22+ and, for the contract, Rust. On Windows set `AWS_LC_SYS_PREBUILT_NASM=1` before cargo.

```bash
cd contracts && cargo test
```
See `test result: ok. 45 passed`.

```bash
cd frontend && npm ci && npm test
```
The regular suite includes pure-logic and in-memory tests. The live-network test is skipped unless `LIVE=1`. See the verification note below for the latest checked result.

```bash
cd frontend && npm run dev
```
See a local site on http://localhost:5173, talking to the same testnet contract. Add `?mock` before the `#` to work without the network.

Live checks. These use the network and make throwaway testnet accounts through NEAR's public helper. The helper rate-limits by IP: after about a dozen accounts in a morning it answered `retry in 11 hours`. If that happens, set `E2E_PARENT` or `ATTACK_ROOT` to a JSON file with `{ accountId, secret }` of a funded testnet account; the scripts explain how.

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
See `PASS` on every line: the whole story on the deployed site in a real browser engine, the guest on a 360 px touch screen. Set `CHROME` to your browser's path if it is not the Windows default. Report and screenshots: [`docs/evidence/`](docs/evidence/).

Rebuild the wasm (optional, the deployed contract already matches this source):

```bash
rustup target add wasm32-unknown-unknown
cd contracts && cargo build --target wasm32-unknown-unknown --release
```
`.cargo/config.toml` adds `--cfg near`. Without it every on-chain panic loses its message.

### Verification of this change

- `cd frontend` then `npm run typecheck` and `npx vitest run`: typecheck passed; 44 tests passed and 2 live tests skipped. Live tests remain opt-in.
- Read-only curl with a browser `Origin` header: Nearblocks returned HTTP 200 and `Access-Control-Allow-Origin: *`, but empty results. RPC returned the known successful withdrawal callback; a reduced public fixture is used in unit tests. See [source checks](docs/evidence/history-source-check.txt).
- [`frontend/e2e/coba.e2e.mjs`](frontend/e2e/coba.e2e.mjs) is a manual testnet script for the one-device story, its pause, the three laptop sizes and passing the envelope on. It has not been run. No browser was launched for this change.
- One native sub-account funding call passed on testnet, using one helper account and in-memory keys. It created a child with exactly 0.4 test NEAR and waited for finality. The opt-in check is `LIVE_SUBACCOUNT=1 npx vitest run src/chain/subaccount-check.test.ts` (use your shell's environment-variable syntax). No Amplop contract methods were called.
- The new story's full network path, NFT transfer through the browser, 60-second target, rendered layout and full indexed history remain unverified. No browser or e2e was run, and nothing was deployed.

## How control moves when the NFT is transferred

The money lives inside the contract, booked per token id, not in anyone's account. Every money method asks one question: *who holds this NFT right now?*

- `withdraw` and `reciprocate` call `require_holder`, which reads the owner from NEP-171 state at call time. No owner is stored anywhere else.
- On `nft_transfer` the balance, the locked seeds and every entry stay with the token id, so they move with it automatically. The new holder inherits both the money and the promises. The old holder is refused from that block on.
- During `nft_transfer_call` a lock blocks `withdraw` and `reciprocate`, so a buyer cannot drain the amplop inside `nft_on_transfer` while the sale can still revert. After 300 blocks the lock goes stale, so a receiver cannot freeze the amplop forever.
- A failed payout goes back into the amplop, not to the void.
- The contract account has no access keys. There is no admin, no upgrade and no pause, for us or anyone.

**Before buying an amplop**, read `hajatan(token_id)`: the seller may withdraw free money up to the moment of sale. Seeds cannot be withdrawn by anyone; they only leave as a reply to the guest who gave them.

## What we attacked

[17 attacks](docs/THREAT-MODEL.md), each with its defence and the test that proves it. 12 checks ran for real against the deployed contract on testnet, and each counted only if the call failed **and** the state did not change. The ones that matter most to a buyer or a guest:

| Attack | Defence | Proof |
|---|---|---|
| Seller keeps withdrawing after the sale | Holder read from NEP-171 at call time | `old_owner_cannot_withdraw_after_transfer`, live L9 |
| Buyer drains the amplop inside `nft_on_transfer`, then the sale reverts | Lock set before the transfer | `withdraw_blocked_while_sale_settles` |
| Receiver never resolves, freezing the amplop | Lock goes stale after 300 blocks | `stale_lock_releases_after_lock_max_blocks` |
| Host withdraws the guests' seeds | `withdraw` pays only `balance - seed_locked` | `withdraw_pays_only_free_money_and_never_touches_seeds`, live L10, L11 |
| Host sends a seed to a friend | Target must be held by the original giver | `reply_cannot_be_redirected_to_someone_else`, live L6 |
| Reply twice from one seed | Entry marked `replied` | `a_gift_can_be_replied_only_once`, live L8 |
| Forge the payout callback | `#[private]` | Live L3 |
| Payout fails and the money vanishes | Refund into the amplop | `failed_payout_refunds_into_the_amplop` |
| The developer changes the rules later | Zero access keys | Live L1 |

## Measured on testnet

Reproduce the first table with `cd scripts && node measure.mjs` (see [`measured-testnet.txt`](docs/evidence/measured-testnet.txt)).

One full cycle through the web client, 3 November 2026 UTC:

| Call | Gas burnt | Fee | Transaction |
|---|---|---|---|
| `open_hajatan` | 5.47 TGas | 0.000525 NEAR | [9cDvqFm9…](https://testnet.nearblocks.io/txns/9cDvqFm9hBvdZgxFrHdL5PViAvGEtev5F1ZYYnhrwdxk) |
| `give` | 3.05 TGas | 0.000282 NEAR | [23fkWd22…](https://testnet.nearblocks.io/txns/23fkWd22hwQKgFJc8aFxJrLpQJg42PbDaX3PwL5Ci71u) |
| `reciprocate` | 3.71 TGas | 0.000349 NEAR | [53gPm5NA…](https://testnet.nearblocks.io/txns/53gPm5NADLhf6xq56p7A1Z7VmCVrkc9rvV1UCxtnuAxV) |
| `withdraw` | 5.69 TGas | 0.000502 NEAR | [CVz6QvXk…](https://testnet.nearblocks.io/txns/CVz6QvXk8Z62thL6Ed82aABjraBiCaCr3kmHxNuhSA45) |

Other measurements:

| What | Result | When | Source |
|---|---|---|---|
| Whole cycle by the web client: open, give, ring, reply, withdraw | 31.7 s | 3 Nov 2026 | [`web-client-live.txt`](docs/evidence/web-client-live.txt) |
| New guest gives on the deployed site, 360 px emulated touch screen, account already seated | 5.3 s | 4 Nov 2026 | Step E4 in [`e2e-report.txt`](docs/evidence/e2e-report.txt) |
| Storage a gift pays for its own entry | 0.0015 NEAR | 2 Nov 2026 | Step A02 in [`full-cycle-report.txt`](docs/evidence/full-cycle-report.txt) |
| Live attacks refused | 12 of 12 | 4 Nov 2026 | [`attacks-report.txt`](docs/evidence/attacks-report.txt) |

## What is not solved

Written down so nobody has to discover it. Full list: [threat model](docs/THREAT-MODEL.md#not-defended), [roadmap](docs/ROADMAP.md).

- **Amounts are public on chain.** The app hides names and amounts from non-holders, but that is a screen, not secrecy.
- **The guest's key lives in the browser.** Clear the browser or change phones and that account is gone, so the old amplop can no longer find you. This is the biggest gap in the product: the promise runs for years, and a browser key does not. Google or email login through NEAR Auth is the fix, but its shared testnet client only accepts `http://localhost:3000` as a callback (checked 4 November 2026), so a public site needs approved credentials we do not have.
- **"No wallet" still means someone funds the guest.** Here the testnet helper does. A real product needs rupiah in through QRIS, a stablecoin, and gas sponsored by a relayer. None of that is built.
- **Rupiah is a demo rate,** not a market price.
- **Public history coverage is incomplete.** Nearblocks returned HTTP 200 with empty transaction lists for this contract and a known past transaction when checked. Chain entries and current holder remain readable. Verified receipt references from this device supplement them, but earlier payouts and holders can remain unavailable.
- **The holder gate is a screen.** Reading the contract directly shows the same data.
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
- Web: React 19, Vite 8, TypeScript, `near-api-js` 7.4.0, `qrcode`, `three`, GSAP. App display and body fonts: Zodiak and Satoshi.
- Tests: `cargo test`, Vitest, `playwright-core` driving an installed Chrome.
- Testnet RPC: FastNEAR. Accounts: NEAR testnet helper. Hosting: Vercel.
- AI: code and documentation were written with AI coding assistants (Claude Code, OpenAI Codex), and several AI chat assistants were consulted when choosing the idea. The landing page sky video comes from Google Flow (Veo). Photographs, envelopes, clouds and glass objects were generated with OpenAI image generation. Listed here as the hackathon rules ask. Test counts and attack results in this README come from the commands above.

## Team

Dex Bennett (solo), Information Systems student, Universitas Kristen Duta Wacana, Yogyakarta.

## License

MIT, see [LICENSE](LICENSE).
