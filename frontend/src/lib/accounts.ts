/** NEAR named and implicit account syntax. Existence is checked by the network. */
export function validReceiver(value: string, current: string): boolean {
  return value !== current && value.length >= 2 && value.length <= 64 &&
    /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(value) &&
    (value.endsWith('.testnet') || /^[a-f0-9]{64}$/.test(value));
}
