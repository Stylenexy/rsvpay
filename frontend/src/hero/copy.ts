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
      { big: "Sam comes to Maya's wedding.", mark: "Maya's wedding.", small: 'Guests bring cash in envelopes. Sam scans a QR at the guest table and gives $100.' },
      { big: '$5 is kept.', mark: '$5', small: '$95 goes straight to Maya. The rest stays in the envelope, to give back to Sam one day.' },
      { big: 'Two years pass.', mark: 'Two years', small: 'The guest book is long gone. The record in this envelope is not.' },
      { big: "Sam marries. Maya's envelope rings.", mark: 'rings.', small: '' },
      { big: 'Given back.', mark: 'Given back.', small: '$100 reaches Sam. Maya never had to remember a thing.' },
    ],
    rail: ["Maya's wedding", 'Kept', 'Two years', 'Sam marries', 'Given back'],
    gift: 'Envelope from Sam',
    forSiti: 'For Maya',
    kept: 'Kept to give back',
    ringTitle: 'Give back to Sam now',
    ringLine: '$5 already kept, $95 from you.',
    reply: 'Send $100',
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
      { big: 'Sam 来参加 Maya 的婚礼。', mark: 'Maya 的婚礼。', small: '宾客用信封送礼金。Sam 在迎宾台扫码，送上 $100。' },
      { big: '$5 留在红包里。', mark: '$5', small: '$95 直接交给 Maya。余下的留在红包里，将来回礼给 Sam。' },
      { big: '两年过去了。', mark: '两年', small: '礼金簿早已不知去向，但这个红包里的记录还在。' },
      { big: 'Sam 结婚了。Maya 的红包响了。', mark: '响了。', small: '' },
      { big: '礼金已回赠。', mark: '礼金已回赠。', small: '$100 送到了 Sam 手中。Maya 什么都不用记。' },
    ],
    rail: ['Maya 的婚礼', '留存', '两年', 'Sam 结婚', '回礼'],
    gift: '来自 Sam 的红包',
    forSiti: '给 Maya',
    kept: '留作回礼',
    ringTitle: '立即给 Sam 回礼',
    ringLine: '$5 已留存，$95 由你补上。',
    reply: '发送 $100',
    drag: '按住并拖动，让时间流动',
    guest: '以宾客身份试试',
    host: '创建婚礼红包',
    replay: '再看一遍',
    test: 'NEAR 测试网试用版，使用的是测试币。',
    story: '这里只是演示，没有真实交易。',
  },
  ko: {
    locale: 'ko-KR',
    what: '잃어버릴 수 없는 축의금 장부',
    make: '봉투 만들기',
    beats: [
      { big: 'Sam이 Maya의 결혼식에 왔습니다.', mark: 'Maya의 결혼식', small: '하객은 봉투에 축의금을 담아 옵니다. Sam은 접수대에서 QR을 찍고 $100를 냅니다.' },
      { big: '$5는 봉투에 남습니다.', mark: '$5', small: '$95는 바로 Maya에게 갑니다. 나머지는 봉투에 남아, 언젠가 Sam에게 보답할 몫이 됩니다.' },
      { big: '2년이 지났습니다.', mark: '2년', small: '방명록은 어디로 갔는지 모릅니다. 이 봉투의 기록은 그대로입니다.' },
      { big: 'Sam이 결혼합니다. Maya의 봉투가 울립니다.', mark: '울립니다.', small: '' },
      { big: '마음을 전했습니다.', mark: '마음을 전했습니다.', small: '$100가 Sam에게 도착했습니다. Maya는 아무것도 기억할 필요가 없었습니다.' },
    ],
    rail: ['Maya의 결혼식', '남겨 둠', '2년', 'Sam의 결혼', '마음 전함'],
    gift: 'Sam의 봉투',
    forSiti: 'Maya에게',
    kept: '보답할 몫',
    ringTitle: '지금 Sam에게 마음 전하기',
    ringLine: '$5는 남겨 둔 몫, $95는 내가 보탭니다.',
    reply: '$100 보내기',
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
      { big: 'Sam が Maya の結婚式に来ました。', mark: 'Maya の結婚式', small: 'インドネシアでも、お祝いは封筒に包みます。Sam は受付で QR を読み取り、$100 を贈ります。' },
      { big: '$5 が袋に残ります。', mark: '$5', small: '$95 はそのまま Maya へ。残りは袋の中に、いつか Sam にお返しする分として残ります。' },
      { big: '二年が過ぎました。', mark: '二年', small: '芳名帳はどこかへ。でも、この袋の記録は残っています。' },
      { big: 'Sam が結婚します。Maya のご祝儀袋が鳴ります。', mark: '鳴ります。', small: '' },
      { big: 'お返しできました。', mark: 'お返しできました。', small: '$100 が Sam に届きました。Maya は何も覚えておく必要がありませんでした。' },
    ],
    rail: ['Maya の結婚式', '残す', '二年', 'Sam の結婚', 'お返し'],
    gift: 'Sam からのご祝儀',
    forSiti: 'Maya へ',
    kept: 'お返しの分',
    ringTitle: '今すぐ Sam にお返しする',
    ringLine: '$5 は残した分、$95 はあなたから。',
    reply: '$100 を送る',
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
      { big: 'Sam đến dự đám cưới của Maya.', mark: 'đám cưới của Maya', small: 'Ở Indonesia, khách cũng mừng cưới bằng phong bì. Sam quét mã QR ở bàn đón khách và mừng $100.' },
      { big: '$5 nằm lại trong phong bì.', mark: '$5', small: '$95 đến thẳng tay Maya. Phần còn lại để dành, một ngày mừng lại Sam.' },
      { big: 'Hai năm trôi qua.', mark: 'Hai năm', small: 'Cuốn sổ mừng cưới đã thất lạc. Ghi chép trong phong bì này thì không.' },
      { big: 'Sam kết hôn. Phong bì của Maya reo lên.', mark: 'reo lên.', small: '' },
      { big: 'Đã mừng lại.', mark: 'Đã mừng lại.', small: '$100 đã đến tay Sam. Maya không cần phải nhớ gì cả.' },
    ],
    rail: ['Đám cưới', 'Giữ lại', 'Hai năm', 'Sam kết hôn', 'Mừng lại'],
    gift: 'Phong bì của Sam',
    forSiti: 'Cho Maya',
    kept: 'Phần để mừng lại',
    ringTitle: 'Mừng lại Sam ngay',
    ringLine: '$5 đã giữ sẵn, $95 từ bạn.',
    reply: 'Gửi $100',
    drag: 'Giữ và kéo để di chuyển thời gian',
    guest: 'Thử làm khách mời',
    host: 'Tạo phong bì cưới',
    replay: 'Xem lại',
    test: 'Bản thử trên NEAR testnet. Tiền thử, không phải tiền thật.',
    story: 'Đây chỉ là minh họa, không có giao dịch thật.',
  },
};
