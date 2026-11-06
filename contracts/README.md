# amplop_balas

Wedding-gift NFT that holds its own money, remembers who gave, and replies when the giver hosts their own celebration. Built on the Kado engine (escrow per token id). Testnet only, not audited.

```
rustup target add wasm32-unknown-unknown
set AWS_LC_SYS_PREBUILT_NASM=1        # Windows only (avoids needing NASM)
cargo test                            # 54 unit tests
cargo build --target wasm32-unknown-unknown --release   # .cargo/config.toml adds --cfg near
```
Without `--cfg near` every on-chain panic loses its message (`WasmTrap(Unreachable)`). On-chain cycle: `../scripts/spk-a1.mjs` (needs `npm ci` in `../scripts`). Design: `../docs/ARCHITECTURE.md`.
