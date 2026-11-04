import type { Lang } from './copy';

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
      cards: ['Budi gives to Siti', 'Siti gives back to Budi', 'Budi gives back to Siti'],
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
      big: 'Empat hal yang buku tamu tidak bisa.',
      panels: [
        { t: 'QR di meja tamu', d: 'Tamu memindai dan memberi. Tanpa memasang aplikasi.' },
        { t: 'Buku yang tidak hilang', d: 'Siapa memberi, berapa, dan ucapannya. Milik keluarga, bukan milik perusahaan.' },
        { t: 'Sebagian disimpan', d: 'Kamu tentukan saat membuka amplop, paling banyak 10%. Tidak bisa diubah lagi.' },
        { t: 'Berbunyi saat waktunya', d: 'Saat tamu membuka hajatannya sendiri, amplopmu memberi tahu. Sekali ketuk untuk membalas.' },
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
        { t: '迎宾台上的二维码', d: '宾客扫码送礼,无需安装应用。' },
        { t: '不会丢的账本', d: '谁送的、送多少、写了什么祝福。属于家庭,不属于公司。' },
        { t: '留下一部分', d: '打开红包时由你设定,最多 10%,之后不能更改。' },
        { t: '到时候就会响', d: '当宾客办自己的喜事,红包会提醒你。一键回礼。' },
      ],
    },
    round: {
      kicker: '多年以后',
      big: '每一次回礼,都是下一次的开始。',
      line: '每次回礼本身也是一份礼,也留下自己的一部分。两家人可以这样往来几十年。',
      cards: ['Budi 送礼给 Siti', 'Siti 回礼给 Budi', 'Budi 回礼给 Siti'],
    },
    proof: {
      kicker: '写给谨慎的人',
      big: '别信我们,自己查。',
      rows: [
        '合约上的密钥。规则谁也改不了,包括我们。',
        '针对线上合约的攻击全部被拒绝。',
        '合约测试通过,包括付款途中转售。',
        '留存比例上限。红包打开后永久固定。',
      ],
      note: '仅在测试网。未经审计。尚无独立用户。',
      link: '查看合约',
    },
    names: {
      kicker: '不只在这里',
      big: '同一个承诺,许多名字。',
      lands: ['印度尼西亚', '中国', '韩国', '日本', '越南'],
    },
    close: {
      big: '打开第一个红包。',
      line: '只要一分钟,承诺却能延续多年。',
      phone: '或扫码,用手机当一回宾客。',
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
        { t: '때가 되면 울립니다', d: '하객이 자기 행사를 열면 봉투가 알려 줍니다. 한 번만 누르면 마음을 전합니다.' },
      ],
    },
    round: {
      kicker: '몇 년 뒤',
      big: '모든 답례가 다음 답례의 시작입니다.',
      line: '답례도 하나의 선물이라 자기 몫을 남깁니다. 두 가족이 수십 년을 이어갈 수 있습니다.',
      cards: ['Budi가 Siti에게', 'Siti가 Budi에게 답례', 'Budi가 Siti에게 답례'],
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
      cards: ['Budi から Siti へ', 'Siti から Budi へお返し', 'Budi から Siti へお返し'],
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
        { t: 'Reo lên đúng lúc', d: 'Khi khách tổ chức tiệc của mình, phong bì báo cho bạn. Một chạm để mừng lại.' },
      ],
    },
    round: {
      kicker: 'Nhiều năm sau',
      big: 'Mỗi lần mừng lại mở đầu lần tiếp theo.',
      line: 'Mỗi lần mừng lại cũng là một món quà, với phần giữ lại của riêng nó. Hai gia đình có thể tiếp nối hàng chục năm.',
      cards: ['Budi mừng Siti', 'Siti mừng lại Budi', 'Budi mừng lại Siti'],
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
