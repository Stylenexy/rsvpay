import { AMPLOP_ERRORS as E } from './chain/types';

/** All on-screen text. Indonesian; plain words, no chain jargon (checked by hygiene.test.ts). */
export const t = {
  appName: 'Amplop Balas',
  tagline: 'Amplop kondangan yang ingat, lalu membalas.',
  testnetNote: 'Jaringan uji NEAR. Uang mainan, bukan uang sungguhan.',
  rateNote: 'kurs demo 1 NEAR = Rp500.000',

  beranda: {
    lead: 'Tamu memberi lewat QR. Sebagian kecil disimpan sebagai benih atas nama tamu. Saat tamu itu menikah, amplopmu mengingatkan dan membalas dengan satu ketuk.',
    open: 'Buka hajatan',
    tryGuest: 'Coba jadi tamu',
    mine: 'Hajatanmu',
    none: 'Belum ada hajatan di perangkat ini.',
  },

  buka: {
    title: 'Buka hajatan',
    names: 'Nama pasangan',
    namesHint: 'Siti & Andi',
    date: 'Tanggal',
    dateHint: 'Sabtu, 21 November 2026',
    host: 'Namamu (pemegang amplop)',
    hostHint: 'Siti',
    seed: 'Benih balasan',
    seedNote: 'Bagian dari tiap pemberian yang disimpan atas nama tamu, untuk membalas saat tamu itu berhajat. Tidak bisa diubah sesudah dibuka.',
    submit: 'Buka amplop',
    making: 'Menyiapkan akun uji…',
    opening: 'Membuka amplop…',
  },

  beri: {
    for: 'Amplop untuk',
    youGive: 'Kamu memberi',
    name: 'Namamu',
    nameHint: 'Budi',
    wish: 'Ucapan',
    wishHint: 'Semoga sakinah, Siti & Andi',
    slide: 'Geser untuk memberi',
    tap: 'atau ketuk tombol bulatnya',
    making: 'Menyiapkan akun uji untukmu…',
    sending: 'Mengirim ke amplop…',
    done: (host: string) => `Terkirim. Amplopmu jadi satu bintang di langit ${host}.`,
    seedLine: (seed: string) => `Benih ${seed} disimpan atas namamu. Saat kamu berhajat, amplop ini akan mengingatmu.`,
    proof: 'Lihat bukti transaksi',
    again: 'Beri lagi',
    closed: 'Hajatan ini sudah tidak menerima amplop.',
  },

  buku: {
    sky: (title: string, n: number) => `Langit ${title} · ${n} amplop`,
    free: 'Bebas ditarik',
    seed: 'Benih untuk membalas',
    withdraw: 'Tarik dana bebas',
    withdrawing: 'Menarik…',
    withdrawn: (rp: string) => `${rp} masuk ke akunmu. Benih tetap di amplop.`,
    nothing: 'Belum ada dana bebas untuk ditarik.',
    share: 'Bagikan ke tamu',
    shareHint: 'Tamu memindai QR ini lalu memberi dari ponselnya.',
    copy: 'Salin tautan',
    copied: 'Tautan tersalin',
    empty: 'Belum ada amplop. Bagikan QR ke tamu pertama.',
    arrived: (rp: string, who: string) => `+${rp} · ${who}, baru saja`,
    me: 'Saya pemegang',
    other: 'Orang lain',
    lockedTitle: (who: string) => `Amplop ini milik ${who}`,
    lockedBody: 'Nama tamu dan nominal hanya tampil untuk pemegang amplop. Catatan jujur: nominal tetap tercatat terbuka di jaringan.',
    ring: 'Amplop berbunyi',
    ringBody: (who: string, gave: string) => `${who} dulu memberi ${gave} di hajatanmu. Sekarang ${who} berhajat.`,
    ringSeed: (seed: string, rest: string) => `Benih ${seed} sudah siap. Lengkapi ${rest}?`,
    reply: 'Kirim balasan',
    later: 'Nanti',
    laterNote: 'Tidak ada yang berubah. Amplop tetap ingat.',
    replied: 'Terkirim ke amplop tamu, tertaut ke pemberiannya dulu.',
  },

  akun: {
    label: 'akun',
    none: 'belum ada akun',
    switch: 'Ganti akun',
  },

  notFound: {
    title: 'Halaman tidak ditemukan',
    back: 'Ke beranda',
  },
  loading: 'Memuat…',
  missing: 'Amplop ini tidak ditemukan.',
};

/** Contract and network errors to plain Indonesian. Keys are the exact contract texts. */
const ERRORS: [string, string][] = [
  [E.closed, 'Hajatan ini sudah tidak menerima amplop.'],
  [E.messageTooLong, 'Ucapan terlalu panjang (maksimal 280 huruf).'],
  [E.depositTooSmall, 'Nominal terlalu kecil.'],
  [E.notHolder, 'Hanya pemegang amplop yang bisa melakukan ini.'],
  [E.midTransfer, 'Amplop sedang berpindah tangan. Coba lagi sebentar.'],
  [E.alreadyReplied, 'Pemberian ini sudah dibalas.'],
  [E.nothingFree, 'Belum ada dana bebas untuk ditarik.'],
  [E.noSuchAmplop, 'Amplop ini tidak ditemukan.'],
  ['helper 429', 'Pembuatan akun uji sedang dibatasi. Coba lagi semenit lagi.'],
  ['not enough balance', 'Saldo akun uji tidak cukup.'],
  ['NotEnoughBalance', 'Saldo akun uji tidak cukup.'],
];

export function plainError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const hit = ERRORS.find(([key]) => text.includes(key));
  return hit ? hit[1] : 'Ada yang gagal. Coba lagi.';
}
