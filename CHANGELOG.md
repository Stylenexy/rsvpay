# Changelog

What changed, by day. The project started on 3 November 2026. Commit messages are in Indonesian; this file is the English summary.

## 2026-11-05

### Added
- One-button story at `#/coba`: two throwaway families play the whole cycle on real testnet, with a receipt for each transaction and a labelled recording if the public helper refuses.
- **Pass the envelope on**: the holder hands the NFT to another account, with a confirmation that explains the loss of access.
- History per envelope, from chain views and transaction receipts, with its partial sources stated on screen.
- Six languages across the whole app: English, Indonesian, Chinese, Korean, Japanese, Vietnamese.
- Asset check: every page at two screen sizes, no file may fail and every image must decode.
- `CLAIMS.md` and this changelog.

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
