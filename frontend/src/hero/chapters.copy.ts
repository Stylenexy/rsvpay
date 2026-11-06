import type { Lang } from './copy';
import { BRAND } from '../brand';

/** Play money: rupiah for Indonesian readers, dollars for everyone else at Rp1.000 = $1. */
export const money = (lang: Lang, rp: number) => (lang === 'id' ? `Rp${rp.toLocaleString('id-ID')}` : `$${(rp / 1000).toLocaleString('en-US')}`);

export const CH_DATA = {
  brand: BRAND,
  author: 'Dex Bennett',
  total: '06',
  digits: ['0', '1', '2', '3', '4', '5', '6'],
  steps: ['01', '02', '03', '04'],
  cultureSteps: ['01', '02', '03', '04', '05'],
  milliseconds: 'ms',
  years: ['2026', '2028', '2031'],
  words: ['amplop', '礼金', '축의금', 'ご祝儀', 'tiền mừng'],
  languages: ['English', 'Bahasa Indonesia', '中文', '한국어', '日本語', 'Tiếng Việt'],
  figures: ['0', '12/12', '45', '10%'],
  account: 'rsvpay.testnet',
  hash: 'G2kEEJb7GzFdHD3JeiV5hKQycrRXotxZQnYQpgsv95UL',
  methods: ['view_access_key_list', 'view_account'],
  attacks: [
    'Seller keeps withdrawing after the sale',
    'Buyer drains during the transfer',
    'Receiver never resolves',
    "Host takes the guests' seeds",
    'Host sends a seed to a friend',
    'Reply twice from one seed',
    'Forged payout callback',
    'Payout fails and money vanishes',
    'Developer changes the rules later',
  ],
  tests: [
    'old_owner_cannot_withdraw_after_transfer',
    'withdraw_blocked_while_sale_settles',
    'stale_lock_releases_after_lock_max_blocks',
    'withdraw_pays_only_free_money_and_never_touches_seeds',
    'reply_cannot_be_redirected_to_someone_else',
    'a_gift_can_be_replied_only_once',
    'failed_payout_refunds_into_the_amplop',
    'sale_during_a_payout_in_flight_keeps_every_coin_with_the_token',
  ],
};

type ChapterUI = {
  matches: string; mismatch: string;
  index: string; continue: string; forSiti: string; kept: string;
  ask: string; asking: string; idle: string; failed: string; received: string; unexpected: string;
  keys: string; hash: string; block: string; elapsed: string; receipt: string;
  refused: string; tests: string; fixed: string; threat: string;
  try: string; check: string; languages: string; copyHash: string; copied: string; guest: string; host: string; replay: string;
  trial: string; customs: string[]; tipGuest: string; tipHost: string; tipStory: string; tipAsk: string; allChecks: string;
};

export const CH_UI: Record<Lang, ChapterUI> = {
  en: {
    matches: 'Matches the published record', mismatch: 'Does not match the published record',
    index: 'Chapter', continue: 'Scroll to follow the promise', forSiti: 'for Maya', kept: 'kept for the reply',
    ask: 'Ask the network now', asking: 'Asking the network…', idle: 'A direct answer, from your browser.',
    failed: 'The network did not answer. Try again or check the contract.', received: 'Answer received',
    unexpected: 'The answer differs from the published record. Check the contract.',
    keys: 'Access keys', hash: 'Code hash', block: 'Block', elapsed: 'Round trip', receipt: 'Live network receipt',
    refused: '12 of 12 refused on the live contract. Full list in the threat model.', tests: '45 contract tests pass.',
    fixed: 'Set once. Held for good.', threat: 'Threat model', try: 'Try', check: 'Check', languages: 'Languages',
    copyHash: 'Copy code hash', copied: 'Copied', guest: 'Be a guest', host: 'Make an envelope', replay: 'Replay the story',
    trial: 'Trial version on NEAR testnet. Play money.',
    allChecks: "See every check",
    customs: ['A gift today. A return at their celebration.', 'A red envelope carries a wish for good fortune.', 'A wedding gift, remembered between families.', 'A knot tied around a wish for the couple.', 'A gift of joy, returned when the time comes.'], tipGuest: "Give a gift to a sample wedding.", tipHost: "Set up a gift book for your own wedding.", tipStory: "Watch two families use it, in about a minute.", tipAsk: "Reads the contract directly. Nothing is sent.",
  },
  id: {
    matches: 'Cocok dengan catatan publik', mismatch: 'Tidak cocok dengan catatan publik',
    index: 'Bab', continue: 'Gulir mengikuti janji', forSiti: 'untuk Siti', kept: 'disimpan untuk membalas',
    ask: 'Tanya jaringan sekarang', asking: 'Menunggu jawaban jaringan…', idle: 'Jawaban langsung, dari browsermu.',
    failed: 'Jaringan tidak menjawab. Coba lagi atau periksa kontraknya.', received: 'Jawaban diterima',
    unexpected: 'Jawabannya berbeda dari catatan publik. Periksa kontraknya.',
    keys: 'Kunci akses', hash: 'Hash kode', block: 'Blok', elapsed: 'Waktu tempuh', receipt: 'Bukti langsung dari jaringan',
    refused: '12 dari 12 ditolak di kontrak yang berjalan. Daftar lengkap di model ancaman.', tests: '45 tes kontrak lulus.',
    fixed: 'Sekali ditentukan. Selamanya tetap.', threat: 'Model ancaman', try: 'Coba', check: 'Periksa', languages: 'Bahasa',
    copyHash: 'Salin hash kode', copied: 'Tersalin', guest: 'Jadi tamu', host: 'Buat amplop', replay: 'Putar ulang cerita', trial: 'Versi uji di NEAR testnet. Uang mainan.',
    allChecks: "Lihat semua pemeriksaan",
    customs: ['Memberi hari ini. Membalas di hajatan mereka.', 'Amplop merah membawa doa keberuntungan.', 'Pemberian pernikahan yang diingat antarkeluarga.', 'Simpul yang mengikat doa untuk pengantin.', 'Tanda sukacita, dibalas saat waktunya tiba.'], tipGuest: "Beri hadiah ke pernikahan contoh.", tipHost: "Siapkan buku hadiah untuk pernikahanmu.", tipStory: "Lihat dua keluarga memakainya, sekitar semenit.", tipAsk: "Membaca kontrak langsung. Tidak ada yang dikirim.",
  },
  zh: {
    matches: '与公布记录一致', mismatch: '与公布记录不一致',
    index: '篇章', continue: '滚动，追随承诺', forSiti: '给 Maya', kept: '留作回礼',
    ask: '现在询问网络', asking: '正在询问网络…', idle: '从你的浏览器直接获取答案。',
    failed: '网络没有回应。请重试或查看合约。', received: '已收到答案', unexpected: '答案与公布的记录不同。请查看合约。',
    keys: '访问密钥', hash: '代码哈希', block: '区块', elapsed: '往返时间', receipt: '网络实时回执',
    refused: '线上合约拒绝了全部 12 次检查。完整清单见威胁模型。', tests: '45 项合约测试通过。',
    fixed: '设定一次，永远不变。', threat: '威胁模型', try: '体验', check: '核查', languages: '语言',
    copyHash: '复制代码哈希', copied: '已复制', guest: '成为宾客', host: '创建红包', replay: '重看故事', trial: 'NEAR 测试网试用版。仅使用测试币。',
    allChecks: "查看全部检查",
    customs: ['今天送礼，在对方的喜事上回礼。', '一封红包，寄托美好的祝愿。', '一份贺礼，两家人铭记。', '一枚水引结，系住对新人的祝福。', '一份喜悦，待来日相报。'], tipGuest: "给示例婚礼送一份礼金。", tipHost: "为你的婚礼创建礼金簿。", tipStory: "看两个家庭使用，大约一分钟。", tipAsk: "直接读取合约，不会发送任何内容。",
  },
  ko: {
    matches: '공개 기록과 일치', mismatch: '공개 기록과 불일치',
    index: '장', continue: '스크롤로 약속을 따라가세요', forSiti: 'Maya에게', kept: '답례를 위해 보관',
    ask: '지금 네트워크에 물어보기', asking: '네트워크에 묻는 중…', idle: '브라우저에서 직접 받는 답입니다.',
    failed: '네트워크가 응답하지 않았습니다. 다시 시도하거나 컨트랙트를 확인하세요.', received: '응답을 받았습니다',
    unexpected: '공개된 기록과 다른 응답입니다. 컨트랙트를 확인하세요.',
    keys: '접근 키', hash: '코드 해시', block: '블록', elapsed: '왕복 시간', receipt: '네트워크 실시간 영수증',
    refused: '실제 컨트랙트에서 12건 모두 거부했습니다. 전체 목록은 위협 모델에 있습니다.', tests: '컨트랙트 테스트 45개 통과.',
    fixed: '한 번 정하면 영원히 그대로.', threat: '위협 모델', try: '체험', check: '확인', languages: '언어',
    copyHash: '코드 해시 복사', copied: '복사됨', guest: '하객 되기', host: '봉투 만들기', replay: '이야기 다시 보기', trial: 'NEAR 테스트넷 체험판. 실제 돈이 아닙니다.',
    allChecks: "모든 점검 보기",
    customs: ['오늘의 선물, 그들의 잔칫날에 답례로.', '붉은 봉투에 행운을 빕니다.', '두 가족이 기억하는 결혼 축하의 마음.', '신랑 신부를 위한 소망을 매듭에 담아.', '기쁨을 나누고, 때가 되면 돌려줍니다.'], tipGuest: "예시 결혼식에 축의금을 보내 보세요.", tipHost: "내 결혼식 장부를 만드세요.", tipStory: "두 가족의 이야기를 1분쯤 지켜보세요.", tipAsk: "컨트랙트를 바로 읽어요. 보내는 것은 없어요.",
  },
  ja: {
    matches: '公開記録と一致', mismatch: '公開記録と不一致',
    index: '章', continue: 'スクロールして約束をたどる', forSiti: 'Maya へ', kept: 'お返しのために残す',
    ask: '今、ネットワークに聞く', asking: 'ネットワークに問い合わせ中…', idle: 'ブラウザから直接、答えを受け取ります。',
    failed: 'ネットワークから返答がありません。再試行するか、コントラクトをご確認ください。', received: '回答を受信しました',
    unexpected: '公開記録と異なる回答です。コントラクトをご確認ください。',
    keys: 'アクセスキー', hash: 'コードハッシュ', block: 'ブロック', elapsed: '往復時間', receipt: 'ネットワークの受信記録',
    refused: '稼働中のコントラクトで全12件を拒否。全一覧は脅威モデルに。', tests: '45件のコントラクトテストに合格。',
    fixed: '一度決めたら、ずっとそのまま。', threat: '脅威モデル', try: '体験', check: '確認', languages: '言語',
    copyHash: 'コードハッシュをコピー', copied: 'コピーしました', guest: 'ゲストになる', host: '袋をつくる', replay: '物語をもう一度', trial: 'NEAR テストネットの試用版。テスト用のお金です。',
    allChecks: "すべての検証を見る",
    customs: ['今日の贈り物を、相手のお祝いでお返し。', '紅い包みに、幸運への願いを。', '両家の記憶に残る、お祝いの気持ち。', '水引の結びに、新郎新婦への願いを。', '喜びを贈り、時が来たらお返しを。'], tipGuest: "サンプルの結婚式にご祝儀を贈ります。", tipHost: "自分の結婚式の帳簿を作ります。", tipStory: "二つの家族の使い方を約 1 分で見られます。", tipAsk: "コントラクトを直接読みます。送信はありません。",
  },
  vi: {
    matches: 'Khớp với bản ghi công bố', mismatch: 'Không khớp với bản ghi công bố',
    index: 'Chương', continue: 'Cuộn theo lời hứa', forSiti: 'cho Maya', kept: 'giữ lại để mừng lại',
    ask: 'Hỏi mạng ngay', asking: 'Đang hỏi mạng…', idle: 'Câu trả lời trực tiếp từ trình duyệt của bạn.',
    failed: 'Mạng chưa trả lời. Hãy thử lại hoặc xem hợp đồng.', received: 'Đã nhận câu trả lời',
    unexpected: 'Câu trả lời khác với bản ghi công bố. Hãy xem hợp đồng.',
    keys: 'Khóa truy cập', hash: 'Mã băm', block: 'Khối', elapsed: 'Thời gian khứ hồi', receipt: 'Biên nhận trực tiếp từ mạng',
    refused: 'Cả 12 kiểm tra đều bị từ chối trên hợp đồng đang chạy. Xem đủ trong mô hình đe dọa.', tests: '45 bài kiểm tra hợp đồng đạt.',
    fixed: 'Đặt một lần. Giữ mãi mãi.', threat: 'Mô hình đe dọa', try: 'Thử', check: 'Kiểm tra', languages: 'Ngôn ngữ',
    copyHash: 'Sao chép mã băm', copied: 'Đã sao chép', guest: 'Làm khách', host: 'Tạo phong bì', replay: 'Xem lại câu chuyện', trial: 'Bản thử trên NEAR testnet. Tiền thử nghiệm.',
    allChecks: "Xem mọi kiểm tra",
    customs: ['Mừng hôm nay, đáp lại vào ngày vui của họ.', 'Phong bao đỏ mang lời chúc may mắn.', 'Món quà cưới được hai gia đình ghi nhớ.', 'Nút thắt gửi lời chúc đến đôi uyên ương.', 'Trao niềm vui, đáp lại khi đến lúc.'], tipGuest: "Gửi quà cho một đám cưới mẫu.", tipHost: "Tạo sổ quà cho đám cưới của bạn.", tipStory: "Xem hai gia đình dùng thử, khoảng một phút.", tipAsk: "Đọc trực tiếp hợp đồng. Không gửi gì cả.",
  },
};

/** Everything below the time story. One idea per screen, so few words. */
export type ChaptersCopy = {
  table: { kicker: string; big: string; panels: { t: string; d: string }[] };
  round: { kicker: string; big: string; line: string; cards: string[] };
  proof: { kicker: string; big: string; rows: string[]; note: string; link: string };
  names: { kicker: string; big: string; lands: string[] };
  close: { big: string; line: string; phone: string; built: string };
};

export const CHAPTERS: Record<Lang, ChaptersCopy> = {
  en: {
    table: {
      kicker: 'At the wedding',
      big: 'Four things the notebook never did.',
      panels: [
        { t: 'A QR on the guest table', d: 'Guests scan and give. No app to install.' },
        { t: 'A book that stays', d: 'Who gave, how much, and their wish. Kept for the family, not by a company.' },
        { t: 'A share kept back', d: 'You choose it when you open the envelope, up to 10%. It can never change.' },
        { t: 'It rings on the day', d: 'When a guest opens their own celebration, your envelope tells you. One tap to give back.' },
      ],
    },
    round: {
      kicker: 'Years later',
      big: 'Every reply starts the next one.',
      line: 'Each gift back is a gift of its own, with its own share kept. Two families can keep this going for decades.',
      cards: ['Sam gives to Maya', 'Maya gives back to Sam', 'Sam gives back to Maya'],
    },
    proof: {
      kicker: 'For the careful',
      big: "Don't trust us. Check.",
      rows: [
        'Keys on the contract. Nobody can change the rules, including us.',
        'Attacks on the live contract refused.',
        'Contract tests pass, including a sale in the middle of a payout.',
        'The most a host can keep back. Fixed for good when the envelope opens.',
      ],
      note: 'Testnet only. Not audited. No independent users yet.',
      link: 'See the contract',
    },
    names: {
      kicker: 'Not only here',
      big: 'One promise, many names.',
      lands: ['Indonesia', 'China', 'Korea', 'Japan', 'Vietnam'],
    },
    close: {
      big: 'Open the first envelope.',
      line: 'It takes a minute. The promise lasts for years.',
      phone: 'Or scan to be a guest on your phone.',
      built: 'Built at NEAR HACKATHON 2026',
    },
  },
  id: {
    table: {
      kicker: 'Di meja tamu',
      big: 'Empat hal yang tak bisa dilakukan buku tamu.',
      panels: [
        { t: 'QR di meja tamu', d: 'Tamu memindai dan memberi. Tanpa memasang aplikasi.' },
        { t: 'Buku yang tidak hilang', d: 'Siapa memberi, berapa, dan ucapannya. Milik keluarga, bukan milik perusahaan.' },
        { t: 'Sebagian disimpan', d: 'Kamu tentukan saat membuka amplop, paling banyak 10%. Tidak bisa diubah lagi.' },
        { t: 'Berbunyi saat harinya tiba', d: 'Saat tamu membuka hajatannya sendiri, amplopmu memberi tahu. Sekali ketuk untuk membalas.' },
      ],
    },
    round: {
      kicker: 'Bertahun-tahun kemudian',
      big: 'Tiap balasan memulai yang berikutnya.',
      line: 'Tiap balasan adalah pemberian baru, dengan simpanannya sendiri. Dua keluarga bisa meneruskannya puluhan tahun.',
      cards: ['Budi memberi ke Siti', 'Siti membalas ke Budi', 'Budi membalas ke Siti'],
    },
    proof: {
      kicker: 'Untuk yang teliti',
      big: 'Jangan percaya kami. Cek sendiri.',
      rows: [
        'Kunci di kontrak. Tidak ada yang bisa mengubah aturannya, termasuk kami.',
        'Serangan ke kontrak yang berjalan ditolak.',
        'Tes kontrak lulus, termasuk penjualan di tengah pembayaran.',
        'Batas simpanan. Tetap selamanya sejak amplop dibuka.',
      ],
      note: 'Hanya jaringan uji. Belum diaudit. Belum ada pengguna independen.',
      link: 'Lihat kontraknya',
    },
    names: {
      kicker: 'Bukan cuma di sini',
      big: 'Satu janji, banyak nama.',
      lands: ['Indonesia', 'Tiongkok', 'Korea', 'Jepang', 'Vietnam'],
    },
    close: {
      big: 'Buka amplop pertama.',
      line: 'Sebentar saja. Janjinya bertahun-tahun.',
      phone: 'Atau pindai untuk jadi tamu dari HP.',
      built: 'Dibangun di NEAR HACKATHON 2026',
    },
  },
  zh: {
    table: {
      kicker: '在迎宾台',
      big: '礼金簿做不到的四件事。',
      panels: [
        { t: '迎宾台上的二维码', d: '宾客扫码送礼，无需安装应用。' },
        { t: '不会丢的账本', d: '谁送的、送多少、写了什么祝福。属于家庭，不属于公司。' },
        { t: '留下一部分', d: '打开红包时由你设定，最多 10%，之后不能更改。' },
        { t: '到时候就会响', d: '当宾客办自己的喜事，红包会提醒你。一键回礼。' },
      ],
    },
    round: {
      kicker: '多年以后',
      big: '每一次回礼，都是下一次的开始。',
      line: '每次回礼本身也是一份礼，也留下自己的一部分。两家人可以这样往来几十年。',
      cards: ['Sam 送礼给 Maya', 'Maya 回礼给 Sam', 'Sam 回礼给 Maya'],
    },
    proof: {
      kicker: '写给谨慎的人',
      big: '别信我们，自己查。',
      rows: [
        '合约上的密钥。规则谁也改不了，包括我们。',
        '针对线上合约的攻击全部被拒绝。',
        '合约测试通过，包括付款途中转售。',
        '留存比例上限。红包打开后永久固定。',
      ],
      note: '仅在测试网。未经审计。尚无独立用户。',
      link: '查看合约',
    },
    names: {
      kicker: '不只在这里',
      big: '同一个承诺，许多名字。',
      lands: ['印度尼西亚', '中国', '韩国', '日本', '越南'],
    },
    close: {
      big: '打开第一个红包。',
      line: '只要一分钟，承诺却能延续多年。',
      phone: '或扫码，用手机当一回宾客。',
      built: '在 NEAR HACKATHON 2026 打造',
    },
  },
  ko: {
    table: {
      kicker: '접수대에서',
      big: '방명록이 못 하는 네 가지.',
      panels: [
        { t: '접수대의 QR', d: '하객은 QR을 찍고 축의금을 냅니다. 앱 설치는 필요 없습니다.' },
        { t: '사라지지 않는 장부', d: '누가, 얼마를, 어떤 말과 함께 보냈는지. 회사가 아니라 가족의 것입니다.' },
        { t: '일부는 남겨 둡니다', d: '봉투를 열 때 정합니다. 최대 10%, 이후에는 바꿀 수 없습니다.' },
        { t: '때가 되면 울립니다', d: '하객에게 기쁜 날이 오면 봉투가 알려 줍니다. 한 번만 누르면 마음을 전합니다.' },
      ],
    },
    round: {
      kicker: '몇 년 뒤',
      big: '모든 답례가 다음 답례의 시작입니다.',
      line: '답례도 하나의 선물이라 자기 몫을 남깁니다. 두 가족이 수십 년을 이어갈 수 있습니다.',
      cards: ['Sam이 Maya에게', 'Maya가 Sam에게 답례', 'Sam이 Maya에게 답례'],
    },
    proof: {
      kicker: '꼼꼼한 분들께',
      big: '믿지 말고 확인하세요.',
      rows: [
        '컨트랙트의 키. 우리를 포함해 아무도 규칙을 바꿀 수 없습니다.',
        '실제 컨트랙트에 대한 공격을 모두 막았습니다.',
        '컨트랙트 테스트 통과. 지급 도중 판매 상황도 포함합니다.',
        '남겨 둘 수 있는 최대치. 봉투를 여는 순간 고정됩니다.',
      ],
      note: '테스트넷 전용. 감사 미실시. 아직 독립 사용자 없음.',
      link: '컨트랙트 보기',
    },
    names: {
      kicker: '여기만이 아닙니다',
      big: '하나의 약속, 여러 이름.',
      lands: ['인도네시아', '중국', '한국', '일본', '베트남'],
    },
    close: {
      big: '첫 봉투를 여세요.',
      line: '잠깐이면 됩니다. 약속은 오래갑니다.',
      phone: '또는 QR을 찍어 휴대폰으로 하객이 되어 보세요.',
      built: 'NEAR HACKATHON 2026에서 제작',
    },
  },
  ja: {
    table: {
      kicker: '受付で',
      big: '芳名帳にできなかった四つのこと。',
      panels: [
        { t: '受付の QR', d: 'ゲストは読み取って贈るだけ。アプリは不要です。' },
        { t: 'なくならない帳面', d: '誰が、いくら、どんな言葉で。会社ではなく家族のものです。' },
        { t: '一部を残す', d: '袋を開くときに決めます。上限 10%、あとから変更できません。' },
        { t: 'その日に鳴る', d: 'ゲストが自分のお祝いを開くと、袋が知らせます。ワンタップでお返し。' },
      ],
    },
    round: {
      kicker: '数年後',
      big: 'お返しは、次のお返しの始まり。',
      line: 'お返しも一つの贈り物で、一部を残します。両家で何十年も続けられます。',
      cards: ['Sam から Maya へ', 'Maya から Sam へお返し', 'Sam から Maya へお返し'],
    },
    proof: {
      kicker: '慎重な方へ',
      big: '信じないで、確かめて。',
      rows: [
        'コントラクトの鍵。私たちを含め、誰もルールを変えられません。',
        '稼働中のコントラクトへの攻撃をすべて拒否。',
        'コントラクトのテストに合格。支払い途中の売却も含みます。',
        '残せる上限。袋を開いた時点で固定されます。',
      ],
      note: 'テストネットのみ。監査なし。独立した利用者はまだいません。',
      link: 'コントラクトを見る',
    },
    names: {
      kicker: 'ここだけではない',
      big: 'ひとつの約束、たくさんの名前。',
      lands: ['インドネシア', '中国', '韓国', '日本', 'ベトナム'],
    },
    close: {
      big: '最初の袋を開こう。',
      line: '一分で済みます。約束は何年も続きます。',
      phone: 'QR を読み取って、スマホでゲストになる。',
      built: 'NEAR HACKATHON 2026 で制作',
    },
  },
  vi: {
    table: {
      kicker: 'Tại bàn đón khách',
      big: 'Bốn điều cuốn sổ không làm được.',
      panels: [
        { t: 'Mã QR trên bàn đón khách', d: 'Khách quét và mừng. Không cần cài ứng dụng.' },
        { t: 'Cuốn sổ không thất lạc', d: 'Ai mừng, bao nhiêu, lời chúc gì. Của gia đình, không phải của công ty.' },
        { t: 'Giữ lại một phần', d: 'Bạn chọn khi mở phong bì, tối đa 10%. Không thể thay đổi sau đó.' },
        { t: 'Reo lên đúng lúc', d: 'Khi khách đến ngày vui của mình, phong bì báo cho bạn. Một chạm để mừng lại.' },
      ],
    },
    round: {
      kicker: 'Nhiều năm sau',
      big: 'Mỗi lần mừng lại mở đầu lần tiếp theo.',
      line: 'Mỗi lần mừng lại cũng là một món quà, với phần giữ lại của riêng nó. Hai gia đình có thể tiếp nối hàng chục năm.',
      cards: ['Sam mừng Maya', 'Maya mừng lại Sam', 'Sam mừng lại Maya'],
    },
    proof: {
      kicker: 'Cho người cẩn thận',
      big: 'Đừng tin chúng tôi. Hãy kiểm tra.',
      rows: [
        'Khóa trên hợp đồng. Không ai đổi được luật, kể cả chúng tôi.',
        'Các cuộc tấn công vào hợp đồng đang chạy đều bị từ chối.',
        'Bài kiểm tra hợp đồng đạt, gồm cả bán giữa lúc đang thanh toán.',
        'Mức giữ lại tối đa. Cố định từ lúc mở phong bì.',
      ],
      note: 'Chỉ trên testnet. Chưa kiểm toán. Chưa có người dùng độc lập.',
      link: 'Xem hợp đồng',
    },
    names: {
      kicker: 'Không chỉ ở đây',
      big: 'Một lời hứa, nhiều cái tên.',
      lands: ['Indonesia', 'Trung Quốc', 'Hàn Quốc', 'Nhật Bản', 'Việt Nam'],
    },
    close: {
      big: 'Mở phong bì đầu tiên.',
      line: 'Chỉ một phút. Lời hứa kéo dài nhiều năm.',
      phone: 'Hoặc quét để làm khách trên điện thoại.',
      built: 'Xây dựng tại NEAR HACKATHON 2026',
    },
  },
};
