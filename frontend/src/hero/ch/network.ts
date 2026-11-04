import { CH_DATA } from '../chapters.copy';

const ENDPOINT = 'https://test.rpc.fastnear.com';
type Query = { block_hash: string; block_height: number; keys?: unknown[]; code_hash?: string };
export type Receipt = { keys: number; hash: string; block: number; blockHash: string; milliseconds: number; matches: boolean };

/** Read both values at one finalized block, so the receipt can be checked again. */
export async function askNetwork(signal: AbortSignal): Promise<Receipt> {
  const start = performance.now();
  const query = async (request: string, block?: string): Promise<Query> => {
    const response = await fetch(ENDPOINT, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: request, method: 'query', params: {
        request_type: request, account_id: CH_DATA.account, ...(block ? { block_id: block } : { finality: 'final' }),
      } }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid RPC response');
    const result: Query | undefined = body.result;
    if (body.error || !result || !Number.isSafeInteger(result.block_height) || result.block_height < 1 || typeof result.block_hash !== 'string' || !result.block_hash) throw new Error('Invalid RPC response');
    return result;
  };
  const access = await query(CH_DATA.methods[0]);
  if (!Array.isArray(access.keys)) throw new Error('Missing access key list');
  const account = await query(CH_DATA.methods[1], access.block_hash);
  if (typeof account.code_hash !== 'string' || !account.code_hash || account.block_hash !== access.block_hash || account.block_height !== access.block_height) throw new Error('Invalid account response');
  return { keys: access.keys.length, hash: account.code_hash, block: access.block_height, blockHash: access.block_hash,
    milliseconds: Math.round(performance.now() - start), matches: access.keys.length === 0 && account.code_hash === CH_DATA.hash };
}
