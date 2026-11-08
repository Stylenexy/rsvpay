import { MockAmplopClient } from './mock';
import { NearAmplopClient } from './near';
import type { AmplopClient } from './types';

/**
 * The one place that picks the client. Default is the live testnet contract;
 * add ?mock to the address to work on screens without touching the network.
 */
export function createClient(): AmplopClient {
  if (new URLSearchParams(window.location.search).has('mock')) return new MockAmplopClient().withSample();
  return new NearAmplopClient();
}
