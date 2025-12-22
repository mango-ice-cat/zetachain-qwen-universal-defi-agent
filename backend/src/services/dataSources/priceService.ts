import axios from 'axios';
import { API_ENDPOINTS } from '../../../../shared/utils/constants';
import logger from '../../utils/logger';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache for prices

// CoinGecko token ID mapping
const TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ZETA: 'zetachain',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  BUSD: 'binance-usd',
};

export interface PriceData {
  symbol: string;
  priceUSD: number;
  timestamp: number;
}

export class PriceService {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = API_ENDPOINTS.COINGECKO;
    const apiKey = process.env.COINGECKO_API_KEY;
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  /**
   * Get price for a single token
   */
  async getPrice(symbol: string): Promise<number> {
    const cacheKey = `price_${symbol}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const tokenId = TOKEN_IDS[symbol.toUpperCase()];
      if (!tokenId) {
        logger.warn(`Token ID not found for ${symbol}, using default price`);
        return this.getDefaultPrice(symbol);
      }

      const url = `${this.baseUrl}/simple/price`;
      const params: Record<string, string> = {
        ids: tokenId,
        vs_currencies: 'usd',
      };

      if (this.apiKey) {
        params['x_cg_demo_api_key'] = this.apiKey;
      }

      const response = await axios.get(url, {
        params,
        timeout: 10000, // 10 second timeout
      });

      const price = response.data[tokenId]?.usd;
      if (price && typeof price === 'number') {
        cache.set(cacheKey, price);
        return price;
      }

      return this.getDefaultPrice(symbol);
    } catch (error: any) {
      logger.error(`Failed to get price for ${symbol}: ${error?.message || error}`);
      return this.getDefaultPrice(symbol);
    }
  }

  /**
   * Get prices for multiple tokens in batch
   */
  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const uncachedSymbols: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cacheKey = `price_${symbol}`;
      const cached = cache.get<number>(cacheKey);
      if (cached !== undefined) {
        prices[symbol] = cached;
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return prices;
    }

    try {
      const tokenIds = uncachedSymbols
        .map(s => TOKEN_IDS[s.toUpperCase()])
        .filter(Boolean);

      if (tokenIds.length === 0) {
        // Use default prices for all
        for (const symbol of uncachedSymbols) {
          prices[symbol] = this.getDefaultPrice(symbol);
        }
        return prices;
      }

      const url = `${this.baseUrl}/simple/price`;
      const params: Record<string, string> = {
        ids: tokenIds.join(','),
        vs_currencies: 'usd',
      };

      if (this.apiKey) {
        params['x_cg_demo_api_key'] = this.apiKey;
      }

      const response = await axios.get(url, {
        params,
        timeout: 10000,
      });

      // Map response back to symbols
      for (const symbol of uncachedSymbols) {
        const tokenId = TOKEN_IDS[symbol.toUpperCase()];
        if (tokenId && response.data[tokenId]?.usd) {
          const price = response.data[tokenId].usd;
          prices[symbol] = price;
          cache.set(`price_${symbol}`, price);
        } else {
          prices[symbol] = this.getDefaultPrice(symbol);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to get batch prices: ${error?.message || error}`);
      // Use default prices for all uncached symbols
      for (const symbol of uncachedSymbols) {
        prices[symbol] = this.getDefaultPrice(symbol);
      }
    }

    return prices;
  }

  /**
   * Get default price (fallback when API fails)
   */
  private getDefaultPrice(symbol: string): number {
    const defaultPrices: Record<string, number> = {
      ETH: 2000,
      BNB: 300,
      SOL: 150,
      ZETA: 1.5,
      USDC: 1.0,
      USDT: 1.0,
      DAI: 1.0,
      BUSD: 1.0,
    };

    return defaultPrices[symbol.toUpperCase()] || 1.0;
  }
}

export const priceService = new PriceService();

