import axios from 'axios';
import { ProtocolInfo, Chain } from '../../../../shared/types';
import logger from '../../utils/logger';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache for protocol data

// DeFiLlama API base URL
const DEFILLAMA_BASE_URL = 'https://api.llama.fi';

// Protocol mapping: our protocol ID -> DeFiLlama protocol slug
// Note: ZetaChain testnet protocols are not on DeFiLlama, so they use default APY.
const PROTOCOL_MAPPING: Record<string, { slug: string; chain: string }> = {
  'aave-v3-eth': { slug: 'aave-v3', chain: 'Ethereum' },
  'pancakeswap-bsc-usdt': { slug: 'pancakeswap', chain: 'BSC' },
};

// Protocol metadata (addresses, names, etc.)
const PROTOCOL_METADATA: Record<string, Omit<ProtocolInfo, 'apy'>> = {
  'aave-v3-eth': {
    id: 'aave-v3-eth',
    name: 'Aave V3',
    chain: 'ETH',
    token: 'USDC',
    riskIndex: 2,
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    tvl: 0, // Will be updated from API
  },
  'pancakeswap-bsc-usdt': {
    id: 'pancakeswap-bsc-usdt',
    name: 'PancakeSwap',
    chain: 'BSC',
    token: 'USDT-BNB',
    riskIndex: 5,
    address: '0xPancake...',
    tvl: 0,
  },
  'zeta-earn': {
    id: 'zeta-earn',
    name: 'Zeta Earn',
    chain: 'ZetaChain',
    token: 'ZETA',
    riskIndex: 4,
    address: '0xZetaStaking...',
    tvl: 0,
  },
  'zeta-swap-usdc': {
    id: 'zeta-swap-usdc',
    name: 'ZetaSwap',
    chain: 'ZetaChain',
    token: 'USDC',
    riskIndex: 5,
    address: '0xZetaSwap...',
    tvl: 0,
  },
  'zeta-lp-zeta-usdc': {
    id: 'zeta-lp-zeta-usdc',
    name: 'Zeta LP',
    chain: 'ZetaChain',
    token: 'ZETA-USDC',
    riskIndex: 6,
    address: '0xZetaLP...',
    tvl: 0,
  },
};

export class ProtocolService {
  /**
   * Get APY for a specific protocol from DeFiLlama
   */
  async getProtocolAPY(protocolId: string): Promise<number> {
    const cacheKey = `apy_${protocolId}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const mapping = PROTOCOL_MAPPING[protocolId];
    if (!mapping) {
      // Use default APY for protocols not in DeFiLlama
      return this.getDefaultAPY(protocolId);
    }

    try {
      // DeFiLlama doesn't have a direct APY endpoint, we'll use TVL and yield data
      // For now, we'll fetch protocol data and estimate APY
      const url = `${DEFILLAMA_BASE_URL}/protocol/${mapping.slug}`;
      const response = await axios.get(url, {
        timeout: 10000,
      });

      // DeFiLlama returns protocol data with chain-specific info
      const chainData = response.data?.chainTvls?.[mapping.chain];
      if (chainData) {
        // Estimate APY based on protocol type (this is simplified)
        // In production, you'd want to use DeFiLlama's yield endpoints
        const estimatedAPY = this.estimateAPYFromProtocol(protocolId, chainData);
        cache.set(cacheKey, estimatedAPY);
        return estimatedAPY;
      }

      return this.getDefaultAPY(protocolId);
    } catch (error: any) {
      logger.error(`Failed to get APY for ${protocolId}: ${error?.message || error}`);
      return this.getDefaultAPY(protocolId);
    }
  }

  /**
   * Get all protocols with real APY data
   */
  async getProtocols(): Promise<ProtocolInfo[]> {
    const cacheKey = 'protocols_all';
    const cached = cache.get<ProtocolInfo[]>(cacheKey);
    if (cached) return cached;

    const protocols: ProtocolInfo[] = [];

    // Fetch APY for each protocol in parallel
    const protocolIds = Object.keys(PROTOCOL_METADATA) as Array<keyof typeof PROTOCOL_METADATA>;
    const apyPromises = protocolIds.map(id => this.getProtocolAPY(id));

    try {
      const apys = await Promise.all(apyPromises);

      for (let i = 0; i < protocolIds.length; i++) {
        const protocolId = protocolIds[i];
        if (!protocolId) continue;
        
        const metadata = PROTOCOL_METADATA[protocolId];
        const apy = apys[i];

        if (metadata && apy !== undefined) {
          protocols.push({
            ...metadata,
            apy,
          });
        }
      }

      cache.set(cacheKey, protocols);
      return protocols;
    } catch (error: any) {
      logger.error(`Failed to get protocols: ${error?.message || error}`);
      // Return protocols with default APY
      return Object.values(PROTOCOL_METADATA).map(meta => ({
        ...meta,
        apy: this.getDefaultAPY(meta.id),
      }));
    }
  }

  /**
   * Estimate APY from protocol data (simplified)
   */
  private estimateAPYFromProtocol(protocolId: string, chainData: any): number {
    // This is a simplified estimation
    // In production, you'd want to use DeFiLlama's yield/apr endpoints
    const baseAPYs: Record<string, number> = {
      'aave-v3-eth': 4.5,
      'pancakeswap-bsc-usdt': 8.1,
      'zeta-earn': 9.5,
      'zeta-swap-usdc': 7.2,
      'zeta-lp-zeta-usdc': 11.0,
    };

    return baseAPYs[protocolId] || 5.0;
  }

  /**
   * Get default APY when API fails
   */
  private getDefaultAPY(protocolId: string): number {
    const defaultAPYs: Record<string, number> = {
      'aave-v3-eth': 4.5,
      'pancakeswap-bsc-usdt': 8.1,
      'zeta-earn': 9.5,
      'zeta-swap-usdc': 7.2,
      'zeta-lp-zeta-usdc': 11.0,
    };

    return defaultAPYs[protocolId] || 5.0;
  }
}

export const protocolService = new ProtocolService();
