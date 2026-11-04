
export const asset = (name: string) => `${import.meta.env.BASE_URL}aset/v2/${name}.webp`;
export const CONTRACT = 'https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet';
// Bundle the real document so the evidence link also works on static hosting.
export const THREAT = `${import.meta.env.BASE_URL}threat-model.md`;
export const THREAT_DOWNLOAD = import.meta.env.VITE_THREAT_MODEL_URL ? undefined : 'THREAT-MODEL.md';

export function Cloud({ className = '', second = false, eager = false }: { className?: string; second?: boolean; eager?: boolean }) {
  return <img className={`ch-cloud ${className}`} src={asset(second ? 'awan-2' : 'awan-1')} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

export function Title({ text, className = '' }: { text: string; className?: string }) {
  return <h2 className={`ch-heading ${className}`} data-lines>{text}</h2>;
}
