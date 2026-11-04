/** Hero words. English first; the other languages are places where wedding gifts are kept in a book and given back. */

export type Lang = 'en' | 'id' | 'zh' | 'ko' | 'ja' | 'vi';

/** Order of the buttons in the navbar. */
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'id', label: 'ID', name: 'Bahasa Indonesia' },
  { id: 'zh', label: '中文', name: '中文' },
  { id: 'ko', label: '한국어', name: '한국어' },
  { id: 'ja', label: '日本語', name: '日本語' },
  { id: 'vi', label: 'VI', name: 'Tiếng Việt' },
];

/** What the same custom is called, shown together on the last screen. */
export const WORDS = ['amplop', '礼金', '축의금', 'ご祝儀', 'tiền mừng'];

export type HeroCopy = {
  locale: string;
  what: string;
  make: string;
  beats: { big: string; mark: string; small: string }[];
  rail: string[];
  gift: string;
  forSiti: string;
  kept: string;
  ringTitle: string;
  ringLine: string;
  reply: string;
  drag: string;
  guest: string;
  host: string;
  replay: string;
  test: string;
  story: string;
};

export const HERO: Record<Lang, HeroCopy> = {
  en: {
    locale: 'en-US',
    what: 'The wedding gift book that cannot get lost',
    make: 'Make an envelope',
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
    story: 'This part is a story. No transaction yet.',
  },
  id: {
    locale: 'id-ID',
    what: 'Buku amplop kondangan yang tidak bisa hilang',
    make: 'Buat amplop',
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
    story: 'Bagian ini cerita, belum ada transaksi.',
  },
  zh: {
    locale: 'zh-CN',
    what: '永远不会弄丢的礼金簿',
    make: '创建红包',
    beats: [
      { big: 'Budi 来参加 Siti 的婚礼。', mark: 'Siti 的婚礼。', small: '在印尼,宾客用信封送礼金。Budi 在迎宾台扫码,送上 Rp100,000。' },
      { big: 'Rp5,000 留在红包里。', mark: 'Rp5,000', small: 'Rp95,000 直接交给 Siti。余下的留在红包里,将来回礼给 Budi。' },
      { big: '两年过去了。', mark: '两年', small: '礼金簿早已不知去向,但这个红包里的记录还在。' },
      { big: 'Budi 结婚了。Siti 的红包响了。', mark: '响了。', small: '' },
      { big: '礼金已回赠。', mark: '礼金已回赠。', small: 'Rp100,000 送到了 Budi 手中。Siti 什么都不用记。' },
    ],
    rail: ['Siti 的婚礼', '留存', '两年', 'Budi 结婚', '回礼'],
    gift: '来自 Budi 的红包',
    forSiti: '给 Siti',
    kept: '留作回礼',
    ringTitle: '立即给 Budi 回礼',
    ringLine: 'Rp5,000 已留存,Rp95,000 由你补上。',
    reply: '发送 Rp100,000',
    drag: '按住并拖动,让时间流动',
    guest: '以宾客身份试试',
    host: '创建婚礼红包',
    replay: '再看一遍',
    test: 'NEAR 测试网试用版,使用的是测试币。',
    story: '这里只是演示,没有真实交易。',
  },
  ko: {
    locale: 'ko-KR',
    what: '잃어버릴 수 없는 축의금 장부',
    make: '봉투 만들기',
    beats: [
      { big: 'Budi가 Siti의 결혼식에 왔습니다.', mark: 'Siti의 결혼식', small: '인도네시아에서도 하객은 봉투에 축의금을 담아 옵니다. Budi는 접수대에서 QR을 찍고 Rp100,000을 냅니다.' },
      { big: 'Rp5,000은 봉투에 남습니다.', mark: 'Rp5,000', small: 'Rp95,000은 바로 Siti에게 갑니다. 나머지는 봉투에 남아, 언젠가 Budi에게 보답할 몫이 됩니다.' },
      { big: '2년이 지났습니다.', mark: '2년', small: '방명록은 어디로 갔는지 모릅니다. 이 봉투의 기록은 그대로입니다.' },
      { big: 'Budi가 결혼합니다. Siti의 봉투가 울립니다.', mark: '울립니다.', small: '' },
      { big: '마음을 전했습니다.', mark: '마음을 전했습니다.', small: 'Rp100,000이 Budi에게 도착했습니다. Siti는 아무것도 기억할 필요가 없었습니다.' },
    ],
    rail: ['Siti의 결혼식', '남겨 둠', '2년', 'Budi의 결혼', '마음 전함'],
    gift: 'Budi의 봉투',
    forSiti: 'Siti에게',
    kept: '보답할 몫',
    ringTitle: '지금 Budi에게 마음 전하기',
    ringLine: 'Rp5,000은 남겨 둔 몫, Rp95,000은 내가 보탭니다.',
    reply: 'Rp100,000 보내기',
    drag: '누른 채 밀어서 시간을 움직이세요',
    guest: '하객으로 체험하기',
    host: '결혼식 봉투 만들기',
    replay: '다시 보기',
    test: 'NEAR 테스트넷 체험판입니다. 실제 돈이 아닙니다.',
    story: '이 장면은 시연이며 실제 거래가 아닙니다.',
  },
  ja: {
    locale: 'ja-JP',
    what: 'なくならないご祝儀帳',
    make: '袋をつくる',
    beats: [
      { big: 'Budi が Siti の結婚式に来ました。', mark: 'Siti の結婚式', small: 'インドネシアでも、お祝いは封筒に包みます。Budi は受付で QR を読み取り、Rp100,000 を贈ります。' },
      { big: 'Rp5,000 が袋に残ります。', mark: 'Rp5,000', small: 'Rp95,000 はそのまま Siti へ。残りは袋の中に、いつか Budi にお返しする分として残ります。' },
      { big: '二年が過ぎました。', mark: '二年', small: '芳名帳はどこかへ。でも、この袋の記録は残っています。' },
      { big: 'Budi が結婚します。Siti のご祝儀袋が鳴ります。', mark: '鳴ります。', small: '' },
      { big: 'お返しできました。', mark: 'お返しできました。', small: 'Rp100,000 が Budi に届きました。Siti は何も覚えておく必要がありませんでした。' },
    ],
    rail: ['Siti の結婚式', '残す', '二年', 'Budi の結婚', 'お返し'],
    gift: 'Budi からのご祝儀',
    forSiti: 'Siti へ',
    kept: 'お返しの分',
    ringTitle: '今すぐ Budi にお返しする',
    ringLine: 'Rp5,000 は残した分、Rp95,000 はあなたから。',
    reply: 'Rp100,000 を送る',
    drag: '押したままドラッグして時間を動かす',
    guest: 'ゲストとして試す',
    host: 'ご祝儀袋をつくる',
    replay: 'もう一度見る',
    test: 'NEAR テストネットの試用版です。お金は本物ではありません。',
    story: 'ここはデモで、実際の取引はありません。',
  },
  vi: {
    locale: 'vi-VN',
    what: 'Sổ tiền mừng cưới không bao giờ thất lạc',
    make: 'Tạo phong bì',
    beats: [
      { big: 'Budi đến dự đám cưới của Siti.', mark: 'đám cưới của Siti', small: 'Ở Indonesia, khách cũng mừng cưới bằng phong bì. Budi quét mã QR ở bàn đón khách và mừng Rp100.000.' },
      { big: 'Rp5.000 nằm lại trong phong bì.', mark: 'Rp5.000', small: 'Rp95.000 đến thẳng tay Siti. Phần còn lại để dành, một ngày mừng lại Budi.' },
      { big: 'Hai năm trôi qua.', mark: 'Hai năm', small: 'Cuốn sổ mừng cưới đã thất lạc. Ghi chép trong phong bì này thì không.' },
      { big: 'Budi kết hôn. Phong bì của Siti reo lên.', mark: 'reo lên.', small: '' },
      { big: 'Đã mừng lại.', mark: 'Đã mừng lại.', small: 'Rp100.000 đã đến tay Budi. Siti không cần phải nhớ gì cả.' },
    ],
    rail: ['Đám cưới', 'Giữ lại', 'Hai năm', 'Budi kết hôn', 'Mừng lại'],
    gift: 'Phong bì của Budi',
    forSiti: 'Cho Siti',
    kept: 'Phần để mừng lại',
    ringTitle: 'Mừng lại Budi ngay',
    ringLine: 'Rp5.000 đã giữ sẵn, Rp95.000 từ bạn.',
    reply: 'Gửi Rp100.000',
    drag: 'Giữ và kéo để di chuyển thời gian',
    guest: 'Thử làm khách mời',
    host: 'Tạo phong bì cưới',
    replay: 'Xem lại',
    test: 'Bản thử trên NEAR testnet. Tiền thử, không phải tiền thật.',
    story: 'Đây chỉ là minh họa, không có giao dịch thật.',
  },
};
