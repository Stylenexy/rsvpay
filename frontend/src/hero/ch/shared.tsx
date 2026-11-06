
export const asset = (name: string) => `${import.meta.env.BASE_URL}aset/v2/${name}.webp`;
export const CONTRACT = 'https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet';
// Bundle the real document so the evidence link also works on static hosting.
export const THREAT = `${import.meta.env.BASE_URL}threat-model.md`;
export const THREAT_DOWNLOAD = import.meta.env.VITE_THREAT_MODEL_URL ? undefined : 'THREAT-MODEL.md';

const SKY = ['187', '145', '101', '047'];
export const CULTURES = ['id', 'zh', 'ko', 'ja', 'vi'];

/** The sky the story ended on simply carries on: night, gold, day and morning, all from the same time-lapse. */
export function SkyLayer() {
  return <div className="ch-sky" aria-hidden="true">
    {SKY.map(frame => <img data-late={`${import.meta.env.BASE_URL}langit/hd/${frame}.webp`} alt="" decoding="async" key={frame} />)}
    <i className="ch-sky-shade" />
    <div className="ch-sky-scenes">{CULTURES.map(id => <img data-ground={asset(`latar-${id}`)} alt="" decoding="async" key={id} />)}<i /></div>
    <div className="ch-sky-clouds"><img data-late={asset('awan-2')} alt="" decoding="async" /><img data-late={asset('awan-1')} alt="" decoding="async" /></div>
  </div>;
}

export function Title({ text, className = '' }: { text: string; className?: string }) {
  return <h2 className={`ch-heading ${className}`} data-lines>{text}</h2>;
}
