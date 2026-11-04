# Design notes

**Idea.** Every amplop becomes a star in the couple's sky. Seeds are blue stars that keep shining after money is withdrawn. Giving back draws a line between families. A book of 186 envelopes reads as a sky, not a table.

**Time is the sky.** The screen moves through the day as the story moves through years: dawn when the guest gives, dusk in the host's book, night when the amplop rings.

| Sky | Used for | Colours |
|---|---|---|
| Fajar (dawn) | Guest gives | `#0A2148`, `#00BFFF`, `#FF9678` |
| Senja (dusk) | Host's book | `#0B1440`, `#FF7A45`, `#7A3FA0`, `#2A2380` |
| Malam (night) | Amplop rings, history | `#05070D`, `#006EFF`, `#7B5CFF`, `#00BFFF` |

Colour carries meaning: seed stars are `#7FDBFF`, change lines are green `#8FE3B5`, and everything else stays calm over the sky.

**Type.** Gloock for names and amounts, because it feels like a celebration. Karla for text. DM Mono for small numbers and chain details.

**Rules we held to:**
- no glow on buttons, no emoji as icons, no pills for decoration;
- sentence-case labels, not spaced capitals;
- the secondary part of a value is dim: the "Rp", the year;
- a number always comes with context: "+Rp200.000 · Om Darto, baru saja";
- one small real object in a card corner, the envelope. A version with a big envelope as the hero was dropped: it pulled the eye away from the sky and the amount;
- small working details: a chip with the amplop number and network.

**Motion explains something.** A card shrinks into a star because a gift became part of the sky. Stars dim on withdrawal because the money left, and seeds stay because they did not.

**Weak spots.** The star metaphor needs one line of text the first time. The envelope object is drawn in CSS and would look better as a real 3D render. Sliding to give may confuse older guests, so tapping the button also works.
