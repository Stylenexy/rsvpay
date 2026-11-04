/** Hero words, Indonesian and English. Plain words only: a first-time visitor reads this with no explanation. */

export type Lang = 'id' | 'en';

export const HERO = {
  id: {
    locale: 'id-ID',
    what: 'Buku amplop kondangan yang tidak bisa hilang',
    make: 'Buat amplop',
    how: 'Cara kerja',
    beats: [
      { big: 'Budi datang ke nikahan Siti.', mark: 'nikahan Siti', small: 'Budi memindai QR di meja tamu dan memberi Rp100.000.' },
      { big: 'Rp5.000 disimpan.', mark: 'Rp5.000', small: 'Rp95.000 langsung untuk Siti. Sisanya tetap di dalam amplop, untuk membalas Budi nanti.' },
      { big: 'Dua tahun berlalu.', mark: 'Dua tahun', small: 'Buku tamunya entah di mana. Catatan di amplop ini tidak ke mana-mana.' },
      { big: 'Budi menikah. Amplop Siti berbunyi.', mark: 'berbunyi.', small: '' },
      { big: 'Terbalas.', mark: 'Terbalas.', small: 'Rp100.000 sampai ke Budi. Siti tidak perlu mengingat apa-apa.' },
    ],
    rail: ['Nikahan Siti', 'Disimpan', 'Dua tahun', 'Budi menikah', 'Terbalas'],
    gift: 'Amplop dari Budi',
    forSiti: 'Untuk Siti',
    kept: 'Simpanan untuk membalas',
    ringTitle: 'Balas Budi sekarang',
    ringLine: 'Rp5.000 dari simpanan, Rp95.000 dari kamu.',
    reply: 'Kirim Rp100.000',
    drag: 'Tahan dan geser untuk memutar waktu',
    guest: 'Coba jadi tamu',
    host: 'Buat amplop hajatan',
    replay: 'Putar lagi',
    test: 'Versi coba di jaringan uji NEAR. Uangnya mainan.',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  },
  en: {
    locale: 'en-US',
    what: 'The wedding gift book that cannot get lost',
    make: 'Make an envelope',
    how: 'How it works',
    beats: [
      { big: "Budi comes to Siti's wedding.", mark: "Siti's wedding.", small: 'Indonesian guests bring cash in envelopes. Budi scans a QR at the guest table and gives Rp100,000.' },
      { big: 'Rp5,000 is kept.', mark: 'Rp5,000', small: 'Rp95,000 goes straight to Siti. The rest stays in the envelope, to give back to Budi one day.' },
      { big: 'Two years pass.', mark: 'Two years', small: 'The guest book is long gone. The record in this envelope is not.' },
      { big: "Budi marries. Siti's envelope rings.", mark: 'rings.', small: '' },
      { big: 'Given back.', mark: 'Given back.', small: 'Rp100,000 reaches Budi. Siti never had to remember a thing.' },
    ],
    rail: ["Siti's wedding", 'Kept', 'Two years', 'Budi marries', 'Given back'],
    gift: 'Envelope from Budi',
    forSiti: 'For Siti',
    kept: 'Kept to give back',
    ringTitle: 'Give back to Budi now',
    ringLine: 'Rp5,000 already kept, Rp95,000 from you.',
    reply: 'Send Rp100,000',
    drag: 'Hold and drag to move time',
    guest: 'Try it as a guest',
    host: 'Make a wedding envelope',
    replay: 'Play again',
    test: 'Trial version on NEAR testnet. Play money.',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
} as const;

export type HeroCopy = (typeof HERO)[Lang];
