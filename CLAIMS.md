# Claims

Every claim this project makes, and where to check it. Checked on 5 November 2026 unless a row says otherwise. Where this file and the chain disagree, trust the chain.

Contract: [`rsvpay.testnet`](https://testnet.nearblocks.io/address/rsvpay.testnet). Live site: https://rsvpay.vercel.app. The contract moved here on 7 November to close issue #1 (T18); reports dated earlier ran against the previous deployment, `amplop-c-mvznhnlx.testnet`, which differs by that one check.

## On chain

| Claim | Proof | Check it yourself |
|---|---|---|
| Nobody can change the rules. The contract account has zero access keys. | RPC answer on 5 November at block 276,347,018: 0 keys. Attack L1 in [`attacks-report.txt`](docs/evidence/attacks-report.txt). | The `curl` line in the [README](README.md), or **Ask the network now** on the site |
| The code on chain is this source. | Hash `G2kEEJb7GzFdHD3JeiV5hKQycrRXotxZQnYQpgsv95UL` read from RPC on 7 November, equal to the local release build in [`measured-testnet.txt`](docs/evidence/measured-testnet.txt) (4 November). | `cd scripts && node measure.mjs` |
| 12 of 12 live attacks fail against the deployed contract. | [`attacks-report.txt`](docs/evidence/attacks-report.txt). Nine are refused calls; L1, L7 and L10 confirm the expected safe state. | `cd scripts && node attacks.mjs` |
| The rights move with the NFT, and the old holder is locked out. | Steps A11 and A12 in [`full-cycle-report.txt`](docs/evidence/full-cycle-report.txt); test `old_owner_cannot_withdraw_after_transfer`; attack L9. | `cd contracts && cargo test` |
| A kept share can only go to the guest who gave it. | Tests `withdraw_pays_only_free_money_and_never_touches_seeds`, `reply_cannot_be_redirected_to_someone_else`; attacks L6, L11. | same |
| A gift can be replied to only once. | Test `a_gift_can_be_replied_only_once`; step A09; attack L8. | same |
| A host keeps back at most 10%, set once. | Test `seed_above_ten_percent_rejected`; contract panic `seed_bps must be 0..=1000 (max 10%)`. | same |
| No coin is lost if a payout fails or the NFT is sold in the middle of one. | Tests `failed_payout_refunds_into_the_amplop`, `sale_during_a_payout_in_flight_keeps_every_coin_with_the_token`. | same |
| 45 contract tests pass. | Fresh `cargo test` on 5 November: 45 passed, 0 failed. CI runs the same command on Linux and has not run yet, because the repository is not public yet. | `cd contracts && cargo test`. On Windows without NASM, set `AWS_LC_SYS_PREBUILT_NASM=1` first. |

## On the site

| Claim | Proof | Check it yourself |
|---|---|---|
| The whole story runs on real testnet from one button, with a receipt per transaction. | [`coba-e2e-report.txt`](docs/evidence/coba-e2e-report.txt): all checks on the last run, 6 November, 37.4 s, while the public helper was refusing this address. Accounts now come from a small testnet purse. If both fail, the page offers the labelled recording: [`coba-refused-report.txt`](docs/evidence/coba-refused-report.txt). | `cd frontend && node e2e/coba.e2e.mjs https://rsvpay.vercel.app` |
| The story takes about a minute or less. | Between 28.6 s and 60.9 s, target 60 s. It depends on the public testnet. If the public helper refuses, the page says so and offers a run clearly labelled as a recording. | same |
| A guest gives from a phone in 20 s or less, with nothing to install. | Step E4 in [`e2e-report.txt`](docs/evidence/e2e-report.txt): 10.7 s, signed in the browser. | `cd frontend && node e2e/alur.e2e.mjs` |
| Guest pages fit a 360 px screen. | Step E3: 0 px overflow. | same |
| Every file of the site answers and every image decodes. | [`asset-check-report.txt`](docs/evidence/asset-check-report.txt): 207 files, five pages, two screen sizes. | `cd frontend && node e2e/aset.e2e.mjs https://rsvpay.vercel.app` |
| A reply shows on both sides: the gift says it was given back, and the receiver's book shows the reply as its own card. | Fields `reply_to` and `replied` from the contract, shown in `frontend/src/pages/Buku.tsx`; screenshot [`coba-book-1366.png`](docs/evidence/coba-book-1366.png). | Finish the story at `#/coba` |
| The landing stays whole after leaving it and coming back. | [`return-check-report.txt`](docs/evidence/return-check-report.txt): back by logo and by browser button, from the very bottom of the page, then 18 quick round trips. | `cd frontend && node e2e/balik.e2e.mjs https://rsvpay.vercel.app` |
| Each inner page says who you are and what happens next, floating over the page without moving it. | [`demo-check-report.txt`](docs/evidence/demo-check-report.txt): layout identical before and after opening the guide, in all six languages. | `cd frontend && node e2e/demo.e2e.mjs https://rsvpay.vercel.app` |
| A demo runs itself from the first field to the last screen, on a laptop and on a phone. It uses the rehearsal client, not testnet, and says so on screen. | Same report. | same |
| The app works in six languages. | Text check in `frontend/src/copy.test.ts`, part of 68 web tests passing (2 skipped) on 6 November. | `cd frontend && npx vitest run` |

## Not claimed

- **Real money.** Testnet only, play money.
- **An audit.** Nobody independent has reviewed the contract.
- **Users.** No independent users yet.
- **A clean last browser run.** The last full run passed 13 of 14 steps. Step E12 failed because a public RPC answered 429, which shows up as a browser console error.
- **Complete history.** The public indexer can be empty for this contract; the page falls back to receipts and says which source it used.
- **Native-speaker translations.** They were written with AI help and checked by a second AI.
- **Smoothness everywhere.** It was measured on a laptop with a GPU before the last rebuild of the five envelopes and the footer, and never on a cheap phone.
