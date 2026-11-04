# Design notes

**Landing page.** One timeline drives everything: a real sky time-lapse (Google Flow, Veo) cut into frames, a glass envelope in real-time 3D, the words, the numbers and the date. The visitor can let it play, hold and drag, or scroll, and it replays exactly in reverse. The envelope is glass because what is kept stays visible, the same way the record is open. Kalnia carries the big lines for its width and character; Noto Serif takes over for Chinese, Korean, Japanese and Vietnamese, where Kalnia has no glyphs. Buttons use Avenir where the device has it, otherwise Nunito Sans. Dark ink on the pale morning, light text once the sun is low; the swap falls between two lines so nothing is read mid-change.

**Inside the app.** Every amplop becomes a star in the couple's sky. Seeds are blue stars that keep shining after money is withdrawn. Giving back draws a line between families. A book of 186 envelopes reads as a sky, not a table.

**Time is the sky.** The screen moves through the day as the story moves through years: dawn when the guest gives, dusk in the host's book, night when the amplop rings.

| Sky | Used for | Colours |
|---|---|---|
| Fajar (dawn) | Guest gives | `#0A2148`, `#00BFFF`, `#FF9678` |
| Senja (dusk) | Host's book | `#0B1440`, `#FF7A45`, `#7A3FA0`, `#2A2380` |
| Malam (night) | Amplop rings, history | `#05070D`, `#006EFF`, `#7B5CFF`, `#00BFFF` |

Colour carries meaning: seed stars are `#7FDBFF`, change lines are green `#8FE3B5`, and everything else stays calm over the sky.

**Type.** Zodiak for names, amounts and headlines: high contrast, warm, it feels like a printed invitation. Satoshi for text and buttons, close to the geometric humanist faces the owner prefers (Avenir, Proxima Nova). DM Mono for chain details. Figtree stands in for Vietnamese marks.

**Rules we held to:**
- no glow on buttons, no emoji as icons, no pills for decoration;
- sentence-case labels, not spaced capitals;
- the secondary part of a value is dim: the "Rp", the year;
- a number always comes with context: "+Rp200.000 · Om Darto, baru saja";
- inside the app, one small real object in a card corner, the envelope; on the landing page the glass envelope is the one big object;
- small working details: a chip with the amplop number and network.

**Motion explains something.** A card shrinks into a star because a gift became part of the sky. Stars dim on withdrawal because the money left, and seeds stay because they did not.

**The page is one long take.** Below the time story there are no sections, only moves: fall through cloud to the wedding, zoom through the light of the phone into the orbit, the disc tilts edge-on and becomes the ruler of the proof, an amber drop wipes into the five cultures, cloud lifts into dawn. Scroll drives everything through one GSAP timeline per chapter, with sticky stages.

**Weak spots.** The orbit disc is a metaphor that needs the line of text beside it. The sky video is upscaled to 1080p, not native. The translations were written with AI help and checked by a second AI, not by native speakers. Performance on low-end phones is not measured.
