# Security

RSVPay is a hackathon project on NEAR testnet. It is not audited and holds only play money. The contract is built so that it could hold real gifts one day, so contract bugs are treated as real bugs.

**What matters most**
- Any way to take money or seeds from an amplop without being its current holder.
- Any way for a host to spend a guest's seed on anything other than a reply to that guest.
- Any way for a previous holder to act after a transfer.
- Any way to change the contract. It has no access keys, so there should be none.

**Report privately.** Open a private security advisory on this repository. Do not open a public issue for a vulnerability.

**Never paste** a private key, seed phrase or real account into an issue, pull request or test file. Test accounts are throwaway: the scripts make them with random keys and keep them in memory.

**What the site can do.** The site is static. It has no server, no database and no secrets. Keys of test accounts stay in the browser that made them (`localStorage`), so anything able to run script on the page could read them. The Content Security Policy in `frontend/vercel.json` limits where the page can connect. This is acceptable for testnet keys and would not be acceptable for real money; see [Roadmap](docs/ROADMAP.md).

**Known limits** are listed in [the threat model](docs/THREAT-MODEL.md#not-defended). You do not need to report those.

We aim to answer within 72 hours during NEAR HACKATHON (until 15 November 2026) and within a week afterwards.
