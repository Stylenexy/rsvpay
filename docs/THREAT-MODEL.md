# Threat model

Written from the point of view of someone trying to keep or steal money.

- **Unit** names a test in `contracts/src/tests.rs`. Run `cargo test` in `contracts/`.
- **Live** is a check in `docs/evidence/attacks-report.txt`, run by `scripts/attacks.mjs` against the deployed keyless contract. It counts only if the call failed **and** the state did not change.

## Attacks

| # | Attack | Defence | Proof |
|---|---|---|---|
| T1 | Seller keeps withdrawing after the sale | Holder read from NEP-171 at call time | Unit `old_owner_cannot_withdraw_after_transfer`; Live L9 |
| T2 | Seller replies from the sold amplop | Same check on `reciprocate` | Unit `old_owner_cannot_reciprocate_after_transfer` |
| T3 | Buyer drains inside `nft_on_transfer`, then the sale reverts | Lock set before the transfer, active for 300 blocks | Unit `withdraw_blocked_while_sale_settles`, `reciprocate_blocked_while_sale_settles` |
| T4 | Receiver never resolves, freezing the amplop | Lock goes stale after 300 blocks | Unit `stale_lock_releases_after_lock_max_blocks` |
| T5 | Reverted sale leaves money or rights behind | Resolver returns the NFT and clears the lock | Unit `sale_reverted_by_receiver_returns_amplop_and_unlocks` |
| T6 | Host withdraws the guests' seeds | `withdraw` pays only `balance - seed_locked` | Unit `withdraw_pays_only_free_money_and_never_touches_seeds`; Live L10, L11 |
| T7 | Host sends a seed to a friend instead of the guest | Target must be held by the original giver | Unit `reply_cannot_be_redirected_to_someone_else`; Live L6 |
| T8 | Reply follows the guest's hajatan to whoever bought it | Same check, re-read at reply time | Unit `reply_cannot_follow_the_giver_hajatan_to_its_buyer`, `ring_stops_when_the_giver_sold_their_hajatan` |
| T9 | Reply twice from one seed | Entry marked `replied` | Unit `a_gift_can_be_replied_only_once`; Live L8 |
| T10 | Forge the payout callback to credit a fake refund | `#[private]` | Live L3 |
| T11 | Forge the transfer resolver to steal the NFT | `#[private]` | Live L4 |
| T12 | Payout fails and the money vanishes | Refund into the amplop, also with a gift or a sale landing mid-flight | Unit `failed_payout_refunds_into_the_amplop`, `failed_payout_with_a_gift_in_between_loses_nothing`, `sale_during_a_payout_in_flight_keeps_every_coin_with_the_token` |
| T13 | Stranger withdraws, closes or replies | `require_holder` | Unit `stranger_cannot_withdraw`, `stranger_cannot_close_hajatan`, `only_holder_can_reciprocate`, `old_owner_cannot_close_the_hajatan_after_transfer`; Live L2 |
| T14 | Spam gifts that cost more storage than they pay | Deposit must exceed the storage of the entry; messages capped at 280 chars | Unit `tiny_gift_rejected`, `long_message_rejected`; Live L5 |
| T15 | Rounding on tiny gifts breaks the books | Seed rounds down; invariants hold | Unit `seed_rounding_on_tiny_gifts_never_breaks_the_books` |
| T16 | Gifts into a closed or missing amplop | Refused | Unit `closed_hajatan_refuses_gifts`, `gift_to_a_missing_amplop_rejected`; Live L12 |
| T17 | The developer changes the rules later | Zero access keys on the contract account | Live L1 |

`#[private]` runs in the wasm entry point, so T10 and T11 can only be proven on chain, not in a unit test.

## Not defended

- **Amounts are public on chain.** An attached deposit is visible in any explorer. The app hides names and amounts from non-holders, but that is a screen, not secrecy.
- **A seller can empty free money before selling.** A buyer must read `hajatan(token_id)` first. Seeds are safe; free money is the seller's until the sale.
- **Guest keys live in the browser.** Clear the browser or change phones and that account is gone, so the old amplop can no longer find the guest. See [Roadmap](ROADMAP.md).
- **Script on the page could read test keys.** The Content Security Policy narrows this. It does not remove it.
- **The testnet helper is a dependency.** If it is down or rate-limits, new guests cannot get an account.
- **Unused seeds stay locked.** If a guest never hosts, the seed never leaves. There is no expiry.
- **A host can ignore the ring.** "Later" changes nothing, and nothing forces a reply. The seed is a promise of the first step, not of the whole amount.
