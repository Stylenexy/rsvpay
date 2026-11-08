# Security

RSVPay is a hackathon project on NEAR testnet. It is not audited and holds only play money. The contract is built so that it could hold real gifts one day, so contract bugs are treated as real bugs.

**What matters most**
- Any way to take money or seeds from an amplop without being its current holder.
- Any way for a host to spend a guest's seed on anything other than a reply to that guest.
- Any way for a previous holder to act after a transfer.
- Any way to change the contract. It has no access keys, so there should be none.

**Report privately.** Open a private security advisory on this repository. Do not open a public issue for a vulnerability.

**Never paste** a private key, seed phrase or real account into an issue, pull request or test file. Test accounts are throwaway: the scripts make them with random keys and keep them in memory.

**What the site can do.** The site is static apart from one function, `frontend/api/dana.ts`, which holds a testnet key for the purse described below. It has no database and no other secrets. The keys of the throwaway accounts stay in each visitor's browser.

**Known limits** are listed in [the threat model](docs/THREAT-MODEL.md#not-defended). You do not need to report those.

We aim to answer within 72 hours during NEAR HACKATHON (until 15 November 2026) and within a week afterwards.

## Testnet purse

`frontend/api/dana.ts` holds one testnet key in a Vercel secret. It guards play money only. It can create sub-accounts of itself and top them up. Anyone can call it, so every spend passes three gates kept on chain as small marker sub-accounts holding a salted hash: six per address per hour, one top-up per account, and sixty of each per day. Top-ups go only to accounts the purse made for a visitor that still hold a key, so markers can never be topped up. The worst case is an empty test purse, after which the site falls back to the public helper. `GET /api/dana` says only whether the purse is healthy. Attacks: [`purse-check-report.txt`](docs/evidence/purse-check-report.txt).

## Not tested live

A receiver holding `nft_on_transfer` for more than 300 blocks has only been tested in unit tests, not on chain. The lock no longer depends on that window.
