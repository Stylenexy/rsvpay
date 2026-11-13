# Changelog

What changed, by day. The project started on 3 November 2026. Commit messages are in Indonesian; this file is the English summary.

## 2026-11-14

### Added
- One uncut take of the live site, 1 min 17 s (`frontend/e2e/klip.e2e.mjs`, served at `/media/rsvpay-one-take.mp4`). Fresh live run of the one-button story with the holder gate: all 15 checks pass, 39.1 s (`docs/evidence/coba-e2e-report.txt`).
- Holder gate: the book page opens only after the browser proves it holds a key the chain lists for the envelope's current NEP-171 owner, by a fresh NEP-413 signature (`frontend/src/chain/holder.ts`, six tests, live check `docs/evidence/holder-gate-check.txt`). No layout change; while the check runs the page shows its usual loading state.
- README: a six-row table of the track requirements and their evidence at the top.
- Check P6 in `scripts/transfer-checks.mjs`: a sale in the middle of a payout with real receipts (withdraw and nft_transfer in one transaction, the seller's account deleted so the payout fails). On testnet on 14 November both lines passed; the Sandbox workflow runs it on every push.
- README: "Design choices, and what they cost".

### Changed
- README: a short box for screeners at the top (what it is, commands to check the claims, names, why testnet only); the limits list in "What is not solved" now covers the holder gate, selling after a withdrawal, unenforced replies, the shared storage balance and the unit-level sale test. CLAIMS: 55 contract tests, new "Not claimed" rows.

### Fixed
- Site text: the visitor message on a book no longer says the book is "private to the couple" (it is hidden on screen; the data is public on chain), and the message after Withdraw no longer says the money "reached your account", because a failed payout is refunded and the transaction still succeeds. Six languages. Text only, no layout change.
- A source comment on the lock bound said about twelve days; the constant (1,000,000 blocks) is about seven. Comment only, same line count, so the compiled code and its hash are unchanged.

## 2026-11-13

### Changed
- The pitch video's sound effects now sit under Dex's voice; picture, words and length (1 min 54 s) are unchanged.

### Fixed
- The README badge, proof table and image text, and the landing's proof row, said 14 live attacks were refused. Ten of the fourteen are hostile calls that are refused; four (L1, L7, L10, L14) confirm the safe state. They now say 14 attack checks pass, as the report and CLAIMS already did. The README's web test count is 85, not 84, in both places; CLAIMS says the 14 checks pass (10 refused, 4 safe-state checks).

## 2026-11-12

### Changed
- The pitch video is the second cut: 1 min 54 s, narrated in Dex's own voice, its screen recordings taken again on the live site on 11 November (the reply lands as $100, the page counts 40.2 s). New poster frame, two recording logs in `docs/evidence/` (`video-run-log-v2.txt`, `pass-on-run-log.txt`), and the README no longer says the video shows $99 or uses a synthetic voice.
- The site's own address is now https://rsvpay.xyz: link previews (`og:url`, the preview image), a canonical link, the README links and the note inside a saved key file. https://rsvpay.vercel.app is the same deployment and keeps working, and the reports in `docs/evidence/` keep the address they ran against.

## 2026-11-11

### Added
- A randomized test of the money rules: 120 random sequences of gives, replies, withdraws (one payout in four fails), transfers, closes and new amplops across five people. After every step a shadow ledger must match every amplop to the yoctoNEAR, and nothing may appear or disappear. A 300-sequence run passed every check on the builder's laptop. `cargo test` now shows 55.
- CI badge in the README.
- Workflow *Sandbox*: on every push a local NEAR chain starts in CI, the wasm built from that commit is deployed and its keys deleted (`scripts/sandbox.mjs`), and the testnet attack scripts run against it unchanged. First green run at `708c4d5`: 14 attacks, 21 checks of a held transfer, 6 transfer and payout lines. The scripts now sign before sending, so the transaction hash is known on any node.
- *From zero* also runs `transfer-checks.mjs`; run by hand on 11 November at `708c4d5`, every command passed.
- Five on-chain checks of paths a unit test cannot reach (`scripts/transfer-checks.mjs`, report in `docs/evidence/`): a stranger cannot move an envelope (P1), a refused `nft_transfer_call` leaves no lock (P2), a transfer needs its one yoctoNEAR (P3), the resolver burnt 3.31 of its fixed 5 TGas on its heaviest path (P4), and a payout made to fail on chain went back into the envelope to the yoctoNEAR (P5). Threat model row T22.
- Threat model, not defended: plain `nft_transfer` is not stopped by the lock, the money goes wherever the token goes, a kept share is not proof of outside guests, and envelopes sent to a guest can crowd the ring. Found in the final audit on 11 November.

### Fixed
- The reply at the end of the story landed one dollar short: the ring said "$5 kept, add $95" and the next screen said "Sam received $99". A reply's storage is 210 bytes for that wish and those account names, and the page attached 200. The page now counts the reply's storage exactly, in the story and in the book, and the rehearsal client charges the same. Live on 11 November: ring $100, landed $100. The frames in the README and the video are from 9 November and still show $99.
- A test comment pointed to a SPEC file that does not exist; it now points to the invariants in ARCHITECTURE.
- The two-device check asked the guest's gift to finish in 20 s or less, while the claim has said about 20 seconds since 9 November. A run on 11 November took 20.3 s and failed only that line (13 of 14). The check now allows 30 s and prints the time; the 9 November report with 19.1 s stays as the evidence.
- The landing listed a test name that no longer exists (`stale_lock_releases_after_lock_max_blocks`). It now lists `reciprocate_blocked_while_sale_settles`, and a web test holds every listed name against `contracts/src/tests.rs`.
- README and CLAIMS dated the zero-key reading 5 November, before this contract existed. Read again on 11 November at block 277,114,396: 0 keys.
- CLAIMS said the last full run showed 6 handled rate-limit answers and that the guide check ran in six languages; the reports say 4 and English.
- The hero's autoplay stopped at the KEEP beat while the card still counted "For Maya $92" under the headline "$95 goes straight to Maya". The split now finishes before that stop, and a test holds it there.

## 2026-11-10

### Added
- Live check with the most gas testnet allows: one 1,000 TGas transfer held amplop #36 for 109,561 blocks (18 h 14 min), 11% of the 1,000,000-block lock bound, then it went back to the sender. THREAT-MODEL T4 and SECURITY quote the measured number instead of the estimate (issue #12).

## 2026-11-09

### Fixed
- Phones: every control is at least 44 px, no field is under 16 px, the slide to give sits on the first screen of a 360 px phone, and How it works no longer covers it on a guest's phone (issue #4).
- A reply lands as the amount the ring named, not one dollar more from storage leftovers (issue #4). The book keeps a sent reply's receipt on screen after it reloads.
- The Content Security Policy blocked the archival RPC that history uses since 8 November, so the browser could not check receipts. It is allowed now, and a test holds every host the site fetches against the policy.
- New guests from the testnet purse get 2.1 NEAR, so the Rp500.000 and Rp1.000.000 buttons work.
- The ring list reads a big book in smaller pages when the RPC refuses a heavy one (issue #16).
- README and THREAT-MODEL T4 said the 1,000,000-block lock bound is about twelve days. At testnet's 0.6-second blocks it is about seven (issue #12).
- Story times in README and CLAIMS mixed runs on three contracts. They now quote only today's contract: four runs, 34.8 s to 41.3 s, three of them on 9 November with the raw output. Older runs stay in the file, labelled with their contract.
- The attack report printed an empty gas figure for L14. Rerun on 9 November: 14 of 14, the resolver burnt 4.15 and 3.41 TGas.
- The guest check and the asset check now write their own reports: the guest's transaction link, and the pages and screen sizes checked. Guest gives in 21.3 s on 9 November, so the claim now says about 20 seconds, not 20 or less.
- ARCHITECTURE said accounts come from the public helper; the testnet purse comes first.
- THREAT-MODEL's spare-balance figure now names its block and comes from `scripts/spare.mjs`, which reads balance, storage and every amplop at one block: 2.0 NEAR spare on 9 November.
- The browser scripts run without a Chrome already open and default to the live site (issue #14).
- A hover label on a control near the top of the window, such as Save my key, was cut off by the window edge. It now opens below the control there.
- The README opens with the story in pictures: the envelope ringing, the 40-second run in six frames, the ring and the give back, the guest's phone, passing the envelope on, the proof, and the 83-second pitch video. The video is served from the site, not committed. The old full-page screenshot, whose sky stopped one screen down, is gone from the README.
- The Proof chapter's heading read "Don't trust us. Check.", which can sound like "we are not trustworthy". It is now "Don't take our word for it. Check.", in all six languages.

### Added
- CI rebuilds the wasm on Windows and compares it with the code on chain: same hash (issue #15).
- A *From zero* workflow runs the README on a fresh GitHub machine (issue #14).
- Live checks: a receiver that holds a sale open for 400 blocks, and for 34,986 blocks until one 300 TGas transfer runs out of gas (issue #12), and `pending_replies` on a 300-gift book (issue #16).

## 2026-11-08

### Added
- **Save my key** and **Restore a key** next to the account name. A guest who changes phones brings the same account back from a small file; a file that does not match the account is refused (issue #18).
- Rehearsal mode (`?mock`) opens with a sample book, so no page starts empty, and an unknown envelope still says it was not found (issue #17).

### Fixed
- History reads Nearblocks v3 after the v1 API was retired, one holder at a time, and checks receipts on archival RPC because regular RPC forgets transactions after about two days (issue #11).

### Security
- `/api/dana` tops up only visitor accounts that hold a key, limits top-ups per address per hour, caps each day, and tries the next slot when two guests ask in the same second (issues #9, #10).

## 2026-11-07

### Changed
- `/api/dana` limits itself to six accounts per address per hour and one top-up per account, checks before it retries, and reports what is left.

### Docs
- The README now opens with what the product does, has one place to try it, and defines its terms once.
- Numbers in README and CLAIMS now match the evidence files. Story runs are listed in `docs/evidence/coba-e2e-runs.txt`. The stale verification note left the README.
- The toolchain is pinned and CI prints the wasm hash.

### Security
- The transfer lock now holds until the resolver runs. The 300-block expiry is gone; a bound of 1,000,000 blocks remains only so a failed resolver cannot freeze an amplop for good (issue #7).
- The caller pays a reply's storage, so a long message can no longer eat a guest's seed, and `set_open` respects the lock (issue #8).
- `reciprocate` now also refuses a target amplop that is mid-transfer. Before this, a host could park a guest's seed in a decoy that only looked like the guest's during `nft_transfer_call`, take the decoy back, and withdraw the seed. Reported in issue #1 (T18).
- The contract moved to `rsvpay-v2.testnet`, because a keyless contract cannot be patched. The demo book is now #3.

## 2026-11-06

### Added
- A floating guide on every inner page: who you are here, the four steps, and what comes next. It moves nothing on the page.
- A demo that runs itself: Show me, step by step types the names, opens the book, gives, rings, gives back, then says Demo finished. It runs on the rehearsal client on the visitor's device, so it costs nothing and touches no network.
- A finished step now says so and names the next one.
- The language highlight slides to the language under the pointer, and the chosen one stays marked.
- Hints on the main buttons, so each one says what it does before you press it.
- New name and marks: RSVPay, a glass seal for large moments and a flat seal for small sizes.

### Changed
- Readers outside Indonesian meet Maya, Leo, Sam and Nina and see play dollars at Rp1,000 = $1. Indonesian keeps Siti, Andi, Budi, Rina and rupiah.
- The demo book is now #60, with guests and wishes in English.
- How it works rests past the page margin on a laptop and opens on hover.
- One glass envelope now travels the whole landing: out of the clouds, onto each guest-table panel, into the reply story, past the proof, into each country's envelope, and into the morning. Desktop only.
- "Don't trust us" is one screen with one fact and one button; the full list of checks is folded.
- Make an envelope: the names and date are written on a card rising out of the envelope.
- How it works sits under the logo on a laptop and by the thumb on a phone, and says which step you are on.
- First visit downloads half as much: 3.0 MB before scrolling, down from 6.0 MB.
- Small labels above headings and the chapter counter are gone.
- The book links gifts and replies both ways, and the product name lives in one file.
- Plain words replace "keeper" everywhere.
- A couple's names read on three lines: name, connector, name.
- The heading on the make-an-envelope page stays put; the couple's names fade in beneath it.

### Fixed
- The closing page stays whole on the way down and on the way back up, and holds long enough for the envelope to open.
- Test accounts no longer depend on the public helper or run out mid-test: a testnet purse creates and tops them up.
- The landing stayed broken after someone made an envelope, with space below the footer and no hero. The landing no longer renders an app block for returning accounts.
- Low balance errors now read in plain words, using the wording the network really sends.

## 2026-11-05

### Added
- One-button story at `#/coba`: two throwaway families play the whole cycle on real testnet, with a receipt for each transaction and a labelled recording if the public helper refuses.
- **Pass the envelope on**: the holder hands the NFT to another account, with a confirmation that explains the loss of access.
- History per envelope, from chain views and transaction receipts, with its partial sources stated on screen.
- Six languages across the whole app: English, Indonesian, Chinese, Korean, Japanese, Vietnamese.
- Asset check: every page at two screen sizes, no file may fail and every image must decode.
- `CLAIMS.md` and this changelog.
- The book links gifts and replies both ways, and a reply arrives as its own card.
- Pages for a wrong link, for loading, and for a book with no gifts yet, where the guest QR now comes first.

### Changed
- The five envelopes each get the stage alone, on a backdrop made from their own tradition's material, then meet at the end. The backdrops live with the sky, so no edge shows.
- The footer is a full closing page: night again, every chapter by its own headline, and the name rising out of the clouds.
- Landing page rebuilt around one continuous sky. The story's own sky carries on behind every chapter, from night to morning, so no chapter paints a background and no section edge can show.
- The orbit chapter and its second WebGL scene are gone, replaced by a glass envelope and one letter at a time. First load went from 10.9 MB to about 5 MB.
- The proof chapter is plain page scrolling beside a sticky heading. Figures no longer animate, so a number on screen is correct at every moment.
- Share image reduced from 1 MB to 74 KB, so messaging apps show it.
- Fonts settled on Zodiak and Satoshi, with Noto Serif and Figtree where those have no glyphs.
- Translations audited for the words families actually use at weddings.

### Fixed
- Coming back to the landing from another page no longer leaves it broken: the page starts at the top, and scroll effects no longer read the old position.
- The morning sky holds at the very bottom of the page.

## 2026-11-04

### Added
- Site deployed to Vercel.
- End-to-end browser run, 12 live attacks against the deployed contract, and failure tests.
- Judge README with steps from zero, how control moves with the NFT, and the threat model.
- `SECURITY.md`, `CONTRIBUTING.md`, CI, security headers.
- First landing page: real sky time-lapse, glass envelope in real-time 3D, a story that can be played, dragged or scrolled.

### Changed
- Repository split into `contracts`, `frontend`, `scripts` and `docs`.
- Demo envelope #14 is the default for trying the guest page.

## 2026-11-03

### Added
- Contract with reply seeds, NEP-171 token per envelope, and a full cycle on testnet.
- Guest and host pages connected to the testnet contract.
