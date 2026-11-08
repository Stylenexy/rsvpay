# Evidence

Reports from real runs. Each one can be reproduced with the command beside it (see the main [README](../../README.md#run-it-from-zero)). None of these files contain keys.

| File | What | Reproduce |
|---|---|---|
| `attacks-report.txt` | 14 live attacks against the deployed contract |
| `wasm-build-check.txt` | An outside rebuild on Linux, and why only a Windows build with the same cargo home matches the code on chain | `cd scripts && node attacks.mjs` |
| `e2e-report.txt` | Whole story from a local build against the deployed contract, guest on a 360 px touch screen | `cd frontend && node e2e/alur.e2e.mjs` |
| `coba-e2e-report.txt` | The one-button story on the live site | `cd frontend && node e2e/coba.e2e.mjs https://rsvpay.vercel.app` |
| `return-check-report.txt` | Leaving the landing from the very bottom and coming back | `cd frontend && node e2e/balik.e2e.mjs https://rsvpay.vercel.app` |
| `asset-check-report.txt` | Every page at two screen sizes: no failed file, every image decodes | `cd frontend && node e2e/aset.e2e.mjs https://rsvpay.vercel.app` |
| `web-client-live.txt` | The web client on testnet, with transaction hashes | `cd frontend && LIVE=1 npx vitest run src/chain/near.live.test.ts --reporter=verbose` |
| `full-cycle-report.txt` | 19 checks: first full cycle from a fresh deployment, then all keys deleted | `cd scripts && node spk-a1.mjs <wasm>` |
| `measured-testnet.txt` | Gas, fees, keys and code hash read from testnet | `cd scripts && node measure.mjs` |
| `0-home.png` … `6-budi-book.png` | Screenshots from those runs | same |
| `qr-try-as-guest.png` | QR to the demo amplop | |

The touch screen in these runs is an emulated phone in Chrome, not a physical device.
