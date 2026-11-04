# Roadmap

What a real product needs that this hackathon build does not have, in the order we would do it.

1. **Identity that outlives a phone.** The promise runs for years, so the guest's account cannot live in one browser. NEAR Auth gives each Google or email login its own NEAR key. Its shared testnet client only accepts `http://localhost:3000` as a callback (checked 4 November 2026), so a public site needs approved credentials.
2. **Rupiah in.** Guests pay by QRIS. A partner converts to a rupiah or dollar stablecoin held in the amplop. Today the demo uses testnet NEAR and a demo rate.
3. **No fees for guests.** A relayer pays gas through NEP-366, only for calls to this contract.
4. **Private amounts.** Today any explorer shows a deposit. Confidential Intents or a similar private path would hide amounts for real.
5. **Seed expiry.** Let a host and guest agree on what happens to a seed after, say, 20 years.
6. **An audit.** Nothing here should hold real money before one.

Regulation is a question of its own. Holding wedding money for people is close to money transmission, and we have not taken advice on it.
