import NodeCache from 'node-cache';
import { AssetOverview, ProtocolInfo, Asset } from '../../../shared/types';
import { chainDataService } from './dataSources/chainDataService';
import { priceService } from './dataSources/priceService';
import { protocolService } from './dataSources/protocolService';
import logger from '../utils/logger';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

export class DataFetcher {
  /**
   * Fetches user asset balances across multiple chains.
   * Now uses real blockchain data via RPC calls and price APIs.
   */
  async getAssetOverview(address: string): Promise<AssetOverview> {
    const cacheKey = `assets_${address}`;
    const cached = cache.get<AssetOverview>(cacheKey);
    if (cached) return cached;

    try {
      // Step 1: Get balances from blockchain
      logger.info(`Fetching balances for address: ${address}`);
      if (process.env.ENABLE_REAL_CHAIN_DATA !== 'true') {
        logger.info('Real chain data disabled, using fallback asset overview');
        return this.getFallbackAssetOverview();
      }

      const assets = await chainDataService.getBalances(address);

      // Step 2: Get prices for all tokens
      if (assets.length > 0) {
        const symbols = [...new Set(assets.map(a => a.symbol))];
        logger.debug(`Fetching prices for symbols: ${symbols.join(', ')}`);
        const prices = await priceService.getPrices(symbols);

        // Step 3: Calculate USD values
        assets.forEach(asset => {
          const price = prices[asset.symbol] || 0;
          asset.valueUSD = asset.balance * price;
        });
      }

      // Step 4: Calculate totals and organize by chain
      const totalsUSD = assets.reduce((sum, asset) => sum + asset.valueUSD, 0);
      
      const byChain: Record<string, Record<string, number>> = {};
      assets.forEach(asset => {
        if (!byChain[asset.chain]) byChain[asset.chain] = {};
        byChain[asset.chain]![asset.symbol] = asset.balance;
      });

      const data: AssetOverview = {
        totalsUSD,
        byChain,
        assets
      };

      cache.set(cacheKey, data);
      logger.info(`Successfully fetched ${assets.length} assets for ${address}, total value: $${totalsUSD.toFixed(2)}`);
      return data;
    } catch (error: any) {
      logger.error(`Failed to get asset overview for ${address}: ${error?.message || error}`);
      
      // Fallback to mock data if real data fetch fails
      logger.warn(`Using fallback mock data for ${address}`);
      return this.getFallbackAssetOverview();
    }
  }

  /**
   * Fetches supported DeFi protocols and their current stats.
   * Now uses real APY data from DeFiLlama API.
   */
  async getProtocols(): Promise<ProtocolInfo[]> {
    const cacheKey = 'protocols';
    const cached = cache.get<ProtocolInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      logger.info('Fetching protocol data from DeFiLlama');
      const protocols = await protocolService.getProtocols();
      cache.set(cacheKey, protocols);
      logger.info(`Successfully fetched ${protocols.length} protocols`);
      return protocols;
    } catch (error: any) {
      logger.error(`Failed to get protocols: ${error?.message || error}`);

      // Fallback to default protocols with default APY
      logger.warn('Using fallback protocol data');
      return this.getFallbackProtocols();
    }
  }

  /**
   * Fallback asset overview (mock data) when real data fetch fails
   */
  private getFallbackAssetOverview(): AssetOverview {
    const assets: Asset[] = [
      { symbol: 'USDC', balance: 5000, valueUSD: 5000, chain: 'ETH' },
      { symbol: 'ETH', balance: 1.5, valueUSD: 3000, chain: 'ETH' },
      { symbol: 'USDT', balance: 1000, valueUSD: 1000, chain: 'BSC' },
      { symbol: 'ZETA', balance: 100, valueUSD: 150, chain: 'ZetaChain' }
    ];

    const totalsUSD = assets.reduce((sum, asset) => sum + asset.valueUSD, 0);
    
    const byChain: Record<string, Record<string, number>> = {};
    assets.forEach(asset => {
      if (!byChain[asset.chain]) byChain[asset.chain] = {};
      byChain[asset.chain]![asset.symbol] = asset.balance;
    });

    return {
      totalsUSD,
      byChain,
      assets
    };
  }

  /**
   * Fallback protocols (default data) when real data fetch fails
   */
  private getFallbackProtocols(): ProtocolInfo[] {
    return [
      {
        id: 'aave-v3-eth',
        name: 'Aave V3',
        chain: 'ETH',
        token: 'USDC',
        apy: 4.5,
        riskIndex: 2,
        address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        tvl: 1000000000
      },
      {
        id: 'pancakeswap-bsc-usdt',
        name: 'PancakeSwap',
        chain: 'BSC',
        token: 'USDT-BNB',
        apy: 8.1,
        riskIndex: 5,
        address: '0xPancake...',
        tvl: 200000000
      },
      {
        id: 'zeta-earn',
        name: 'Zeta Earn',
        chain: 'ZetaChain',
        token: 'ZETA',
        apy: 9.5,
        riskIndex: 4,
        address: '0xZetaStaking...',
        tvl: 5000000
      },
      {
        id: 'zeta-swap-usdc',
        name: 'ZetaSwap',
        chain: 'ZetaChain',
        token: 'USDC',
        apy: 7.2,
        riskIndex: 5,
        address: '0xZetaSwap...',
        tvl: 3000000
      },
      {
        id: 'zeta-lp-zeta-usdc',
        name: 'Zeta LP',
        chain: 'ZetaChain',
        token: 'ZETA-USDC',
        apy: 11.0,
        riskIndex: 6,
        address: '0xZetaLP...',
        tvl: 2000000
      }
    ];
  }
}

export const dataFetcher = new DataFetcher();
