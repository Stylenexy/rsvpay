# Evidence

Reports from real runs. Each one can be reproduced with the command beside it (see the main [README](../../README.md#run-it-from-zero)). None of these files contain keys.

| File | What | Reproduce |
|---|---|---|
| `attacks-report.txt` | 14 live attacks against the deployed contract | `cd scripts && node attacks.mjs` |
| `wasm-build-check.txt` | An outside rebuild on Linux, and why only a Windows build with the same cargo home matches the code on chain | CI job *Rebuild the wasm and compare it with the chain* |
| `long-settle-report.txt` | A receiver holds a sale open 404 and 409 blocks: the lock holds, nothing moves | `cd scripts && node long-settle.mjs` |
| `long-settle-max-report.txt` | The longest hold one 300 TGas transaction can buy: 34,986 blocks | `cd scripts && node long-settle.mjs max` |
| `long-settle-1000tgas-report.txt` | The same hold with 1,000 TGas, the most testnet allows: 109,561 blocks | read from chain, see the report |
| `transfer-checks-report.txt` | A stranger cannot move an envelope, a refused transfer leaves no lock, the resolver's gas on its heaviest path, a payout made to fail on chain | `cd scripts && node transfer-checks.mjs` |
| `reply-amount-check.txt` | Why a reply landed as $99 until 11 November, the storage measured on chain, and the run after the fix | `cd frontend && node e2e/coba.e2e.mjs https://rsvpay.vercel.app` |
| `video-run-log.txt` | Timings of the one-button story as recorded for the pitch video: 39.18 s | recording log, 9 November |
| `scale-report.txt` | `pending_replies` on books of up to 300 gifts, and where the RPC view limit sits | `cd scripts && node scale.mjs` |
| `spare-balance-report.txt` | Contract balance against storage plus what every amplop holds, read at one block | `cd scripts && REPORT=1 node spare.mjs` |
| `phone-check-report.txt` | 96 checks on three phone sizes, two languages | `cd frontend && node e2e/hp.e2e.mjs https://rsvpay.vercel.app` |
| `e2e-report.txt` | Whole story from a local build against the deployed contract, guest on a 360 px touch screen | `cd frontend && node e2e/alur.e2e.mjs` |
| `coba-e2e-report.txt` | The one-button story on the live site | `cd frontend && node e2e/coba.e2e.mjs https://rsvpay.vercel.app` |
| `return-check-report.txt` | Leaving the landing from the very bottom and coming back | `cd frontend && node e2e/balik.e2e.mjs https://rsvpay.vercel.app` |
| `asset-check-report.txt` | Every page at two screen sizes: no failed file, every image decodes | `cd frontend && node e2e/aset.e2e.mjs https://rsvpay.vercel.app` |
| `web-client-live.txt` | The web client on testnet, with transaction hashes | `cd frontend && LIVE=1 npx vitest run src/chain/near.live.test.ts --reporter=verbose` |
| `full-cycle-report.txt` | 19 checks: first full cycle from a fresh deployment, then all keys deleted | `cd scripts && node spk-a1.mjs <wasm>` |
| `measured-testnet.txt` | Gas, fees, keys and code hash read from testnet | `cd scripts && node measure.mjs` |
| `0-home.png`, `0-home-360.png` | The landing on 9 November, 1440 and 360 px | production site |
| `1-guest-before.png` … `6-budi-book.png` | Screenshots from the e2e run | same |
| `qr-try-as-guest.png` | QR to the demo amplop | |

The touch screen in these runs is an emulated phone in Chrome, not a physical device.
