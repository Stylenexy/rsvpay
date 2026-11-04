# Amplop Balas

**A wedding gift that remembers, and gives back.**

At Indonesian weddings, guests give money in envelopes (*amplop*) and families keep a notebook of who gave what, so they can return the favour at the guest's own celebration years later. The notebook gets lost. Amplop Balas makes that notebook an NFT that holds its own money and remembers.

Track: **NFTs That Do Something** + **Open Innovation**. Built at NEAR HACKATHON, November 2026. Testnet only, play money, not audited.

Also by the same builder: **Mintless** (*Kota Tanpa Cetak Uang*, track Games With Real Economies), a separate project with separate code. It is named here because the rules ask each README to name the other.

| | |
|---|---|
| Live demo | https://amplop-balas.vercel.app |
| Contract (testnet) | [`amplop-c-mvznhnlx.testnet`](https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet), zero access keys |
| Source | `contract/` (Rust, near-sdk 5.30), `web/` (React, near-api-js 7.4), `tools/` (testnet scripts) |

## What it does

1. **A host opens a hajatan** (celebration). The contract mints one NFT, the *amplop*, to the host. The host fixes a *reply seed* of 0–10%, which can never change.
2. **A guest scans a QR and gives.** No wallet to install. The gift becomes an entry in the NFT: who, how much, the wish, when. The seed part (say 5%) stays locked in that guest's name. The rest is free for the host to withdraw.
3. **Years later the guest hosts their own hajatan.** The old amplop rings: *"Budi gave Rp500.000. Seed Rp25.000 is ready. Add Rp475.000?"* One tap releases the seed plus the top-up into Budi's amplop as a new entry linked to the old one. Saying "later" changes nothing.

Each reply is itself an entry with its own seed, so the chain of giving back can continue between two families for decades.

## Try it in two minutes

No install. Works on a phone. Amounts in rupiah use a demo rate, marked on screen (1 NEAR = Rp500.000); testnet NEAR has no price.

| Do | See |
|---|---|
| Open https://amplop-balas.vercel.app, tap **Coba jadi tamu** | The guest page of a demo amplop with six gifts already in it |
| Type a name, tap the round button (or slide it) | About 10 seconds later the card shrinks into a star, and a link to the real transaction appears |
| On a laptop open https://amplop-balas.vercel.app/#/buka, tap **Buka amplop** | Your own amplop: a sky, one star per gift, a QR for guests |
| Scan that QR with a phone and give | The laptop updates by itself within 4 seconds: new star, new row, "+Rp… baru saja" |
| Tap **Orang lain** on the laptop | Names and amounts disappear; only the holder sees the book |
| On the phone open `/#/buka` and open a hajatan | The laptop shows **Amplop berbunyi**. Tap **Kirim balasan**, and the reply lands in the phone's amplop |
| Tap **Tarik dana bebas** on the laptop | Free money arrives in the host account; the seeds of unreplied guests stay locked |

Accounts on this demo are throwaway testnet accounts made by your browser through NEAR's public testnet helper. No secret ships with the site.

## Run it from zero

Needs Node 22+ and, for the contract, Rust with the wasm target. Windows: set `AWS_LC_SYS_PREBUILT_NASM=1` before cargo.

```bash
cd contract && cargo test
```
See `test result: ok. 44 passed`.

```bash
cd web && npm ci && npm test
```
See `21 passed | 1 skipped`. The skipped one is the live check below.

```bash
cd web && npm run build && npm run dev
```
See a local site on http://localhost:5173, talking to the same testnet contract. Add `?mock` before the `#` to work without the network.

Live checks. These use the network and make throwaway testnet accounts through the public helper, which rate-limits, so run them a minute apart.

```bash
cd web && LIVE=1 npx vitest run src/chain/near.live.test.ts
```
See `1 passed`: the web client opens, gives, rings, replies and withdraws on testnet.

```bash
cd tools && npm ci && node serangan.mjs
```
See 12 `PASS` lines, one per attack, against the deployed contract. Report: `tools/serangan-laporan.txt`.

```bash
cd web && node e2e/alur.e2e.mjs
```
See 13 `PASS` lines: the whole story on the deployed site in a real browser engine, the guest on a 360 px touch screen. Set `CHROME` to your browser's path if it is not the Windows default. Report and screenshots: `web/e2e/hasil/`.

Rebuild the wasm (optional, the deployed contract already matches this source):

```bash
rustup target add wasm32-unknown-unknown
cd contract && cargo build --target wasm32-unknown-unknown --release
```
`.cargo/config.toml` adds `--cfg near`. Without it every on-chain panic loses its message.

## How control moves when the NFT is transferred

The money lives inside the contract, booked per token id, not in anyone's account. Every money method asks one question: *who holds this NFT right now?*

- `withdraw` and `reciprocate` call `require_holder`, which reads the owner from NEP-171 state at call time. No owner is stored anywhere else.
- On `nft_transfer` the balance, the locked seeds and every entry stay with the token id, so they move with it automatically. The new holder inherits both the money and the promises. The old holder is refused from that block on.
- During `nft_transfer_call` a lock blocks `withdraw` and `reciprocate`, so a buyer cannot drain the amplop inside `nft_on_transfer` while the sale can still revert. A lock that never resolves goes stale after 300 blocks.
- A failed payout goes back into the amplop, not to the void.
- The contract account has no access keys. There is no admin, no upgrade and no pause, for us or anyone.

**Before buying an amplop**, read `hajatan(token_id)`: the seller may withdraw free money up to the moment of sale. Seeds cannot be withdrawn by anyone; they only leave as a reply to the guest who gave them.

## Contract API

Change: `open_hajatan(title, date, seed_bps)`, `give(token_id, message)`, `reciprocate(token_id, entry, to_token_id, message)`, `withdraw(token_id)`, `set_open(token_id, open)`, plus NEP-171 `nft_transfer` and `nft_transfer_call`.

View: `hajatan`, `hajatan_of`, `entries`, `pending_replies`, `is_locked`, plus NEP-171/177/181.

Invariants tested after every step: `balance = free + seed_locked`, and the sum of unreplied seeds equals `seed_locked`. Full table: [`SPEC.md`](SPEC.md).

## Threat model: what we attacked

Written from the point of view of someone trying to keep or steal money. "Unit" names a test in `contract/src/tests.rs`. "Live" is a check in `tools/serangan-laporan.txt`, run on testnet on 4 Nov 2026 against the deployed keyless contract, counted only if the call failed **and** the state did not change.

| # | Attack | Defence | Proof |
|---|---|---|---|
| T1 | Seller keeps withdrawing after the sale | Holder read from NEP-171 at call time | Unit `old_owner_cannot_withdraw_after_transfer`; Live L9 |
| T2 | Seller replies from the sold amplop | Same check on `reciprocate` | Unit `old_owner_cannot_reciprocate_after_transfer` |
| T3 | Buyer drains inside `nft_on_transfer`, then the sale reverts | Lock set before the transfer | Unit `withdraw_blocked_while_sale_settles`, `reciprocate_blocked_while_sale_settles` |
| T4 | Receiver never resolves, freezing the amplop | Lock goes stale after 300 blocks | Unit `stale_lock_releases_after_lock_max_blocks` |
| T5 | Reverted sale leaves money or rights behind | Resolver returns the NFT and clears the lock | Unit `sale_reverted_by_receiver_returns_amplop_and_unlocks` |
| T6 | Host withdraws the guests' seeds | `withdraw` pays only `balance - seed_locked` | Unit `withdraw_pays_only_free_money_and_never_touches_seeds`; Live L10, L11 |
| T7 | Host sends a seed to a friend instead of the guest | Target must be held by the original giver | Unit `reply_cannot_be_redirected_to_someone_else`; Live L6 |
| T8 | Reply follows the guest's hajatan to whoever bought it | Same check, re-read at reply time | Unit `reply_cannot_follow_the_giver_hajatan_to_its_buyer`, `ring_stops_when_the_giver_sold_their_hajatan` |
| T9 | Reply twice from one seed | Entry marked `replied` | Unit `a_gift_can_be_replied_only_once`; Live L8 |
| T10 | Forge the payout callback to credit a fake refund | `#[private]` | Live L3 |
| T11 | Forge the transfer resolver to steal the NFT | `#[private]` | Live L4 |
| T12 | Payout fails and the money vanishes | Refund into the amplop, also with a gift landing mid-flight | Unit `failed_payout_refunds_into_the_amplop`, `failed_payout_with_a_gift_in_between_loses_nothing` |
| T13 | Stranger withdraws, closes or replies | `require_holder` | Unit `stranger_cannot_withdraw`, `stranger_cannot_close_hajatan`, `only_holder_can_reciprocate`, `old_owner_cannot_close_the_hajatan_after_transfer`; Live L2 |
| T14 | Spam gifts that cost more storage than they pay | Deposit must exceed the storage of the entry; messages capped at 280 chars | Unit `tiny_gift_rejected`, `long_message_rejected`; Live L5 |
| T15 | Rounding on tiny gifts breaks the books | Seed rounds down; invariants hold | Unit `seed_rounding_on_tiny_gifts_never_breaks_the_books` |
| T16 | Gifts into a closed or missing amplop | Refused, deposit returns to the sender | Unit `closed_hajatan_refuses_gifts`, `gift_to_a_missing_amplop_rejected`; Live L12 |
| T17 | The developer changes the rules later | Zero access keys on the contract account | Live L1 |

`#[private]` runs in the wasm entry point, so T10 and T11 can only be proven on chain, not in a unit test.

## What is not solved

Written down so nobody has to discover it.

- **Amounts are public on chain.** An attached deposit is visible in any explorer. The app hides names and amounts from non-holders, but that is a screen, not secrecy. Real privacy would need something like Confidential Intents.
- **The guest's key lives in the browser.** Clear the browser or change phones and that account is gone, so the old amplop can no longer find you. This is the biggest gap in the product: the promise runs for years, and a browser key does not. Google or email login through NEAR Auth is the fix, but its shared testnet client only accepts `http://localhost:3000` as a callback (checked 4 Nov 2026), so a public site needs approved credentials we do not have.
- **"No wallet" still means someone funds the guest.** Here the testnet helper does. A real product needs rupiah in through QRIS, a stablecoin, and gas sponsored by a relayer. None of that is built.
- **The testnet helper is a dependency.** If it is down or rate-limits, new guests cannot get an account. Returning guests are unaffected.
- **Unused seeds stay locked.** If a guest never hosts, the seed never leaves. It is small by design (at most 10%), and that is what the promise means. An expiry is future work.
- **Rupiah is a demo rate.** It is not a market price.
- **Not audited, and no independent users yet.** Every test above was run by the builder.

## Tools and libraries

- Contract: Rust, `near-sdk` 5.30.0, `near-contract-standards`.
- Web: React 19, Vite 8, TypeScript, `near-api-js` 7.4.0, `qrcode`. Fonts: Gloock, Karla, DM Mono from Google Fonts.
- Tests: `cargo test`, Vitest, `playwright-core` driving an installed Chrome.
- Testnet RPC: FastNEAR. Accounts: NEAR testnet helper. Hosting: Vercel.
- AI: code and documentation were written with an AI coding assistant (Claude Code), and several AI chat assistants were consulted when choosing the idea. Listed here as the hackathon rules ask. Every claim in this README is checked by the commands above.

## Team

Dex Bennett (solo), Information Systems student, Universitas Kristen Duta Wacana, Yogyakarta.

## License

MIT, see [LICENSE](LICENSE).
