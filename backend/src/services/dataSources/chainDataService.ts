import { ethers } from 'ethers';
import { Chain, Asset } from '../../../../shared/types';
import logger from '../../utils/logger';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 }); // 1 min cache for balance queries

// Testnet ERC20 token addresses
const TOKEN_ADDRESSES: Record<Chain, Record<string, string>> = {
  ETH: {
    // Sepolia Testnet token addresses
    USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Sepolia USDC
    USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia USDT (test token)
    DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6', // Sepolia DAI (test token)
  },
  BSC: {
    // BSC Testnet token addresses
    USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet USDT
    USDC: '0x64544969ed7EBf5f083679233325356EbE738930', // BSC Testnet USDC
    BUSD: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee', // BSC Testnet BUSD
  },
  Solana: {}, // Solana not used for now
  ZetaChain: {
    // ZetaChain Athens Testnet - native ZETA token
    ZETA: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // ZetaChain Athens Testnet native token
  },
};

const NETWORK_CONFIG: Record<Chain, { chainId: number; name: string }> = {
  ETH: { chainId: 11155111, name: 'sepolia' },
  BSC: { chainId: 97, name: 'bsc-testnet' },
  Solana: { chainId: 0, name: 'solana-testnet' },
  ZetaChain: { chainId: 7001, name: 'zetachain-athens' },
};

// RPC URLs with fallbacks
const getRpcUrls = (chain: Chain): string[] => {
  const envKey = `${chain}_RPC_URL`;
  const envValue = process.env[envKey];

  const fallbackRpcs: Record<Chain, string[]> = {
    ETH: [
      'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      'https://rpc.sepolia.org',
    ],
    BSC: [
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://bsc-testnet.publicnode.com',
    ],
    Solana: ['https://api.testnet.solana.com'],
    ZetaChain: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
  };

  const urls = envValue ? [envValue, ...fallbackRpcs[chain]] : fallbackRpcs[chain];
  return Array.from(new Set(urls));
};

    // ERC20 ABI for balanceOf
    const ERC20_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ];

    export class ChainDataService {
      /**
       * Get native token balance (ETH, BNB, SOL, ZETA)
       */
      async getNativeBalance(chain: Chain, address: string): Promise<number> {
        // Skip actual RPC calls in dev mode to prevent log spam
        // unless explicitly enabled via env var
        if (process.env.ENABLE_REAL_CHAIN_DATA !== 'true') {
          return 0;
        }

        const cacheKey = `native_${chain}_${address}`;
        const cached = cache.get<number>(cacheKey);
        if (cached !== undefined) return cached;
    
        try {
      if (chain === 'Solana') {
        // Solana requires @solana/web3.js, skip for now
        logger.warn('Solana native balance not implemented yet');
        return 0;
      }

      const network = NETWORK_CONFIG[chain];
      let lastError: any = null;

      for (const rpcUrl of getRpcUrls(chain)) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl, network, {
            staticNetwork: true,
          });

          // Add timeout to provider calls
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('RPC call timeout')), 10000);
          });

          const balance = await Promise.race([
            provider.getBalance(address),
            timeoutPromise,
          ]) as bigint;

          const balanceInEth = parseFloat(ethers.formatEther(balance));
          cache.set(cacheKey, balanceInEth);
          return balanceInEth;
        } catch (error: any) {
          lastError = error;
          logger.warn(`RPC failed for ${chain} (${rpcUrl}): ${error?.message || error}`);
        }
      }

      logger.error(`All RPC endpoints failed for ${chain}: ${lastError?.message || lastError}`);
      return 0;
    } catch (error: any) {
      logger.error(`Failed to get native balance for ${chain}: ${error?.message || error}`);
      return 0;
    }
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(
    chain: Chain,
    address: string,
    tokenSymbol: string,
    tokenAddress?: string
  ): Promise<number> {
    if (chain === 'Solana') {
      logger.warn('Solana token balance not implemented yet');
      return 0;
    }

    const cacheKey = `token_${chain}_${address}_${tokenSymbol}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const contractAddress = tokenAddress || TOKEN_ADDRESSES[chain]?.[tokenSymbol];
      if (!contractAddress) {
        logger.warn(`Token address not found for ${tokenSymbol} on ${chain}`);
        return 0;
      }

      const network = NETWORK_CONFIG[chain];
      let lastError: any = null;

      for (const rpcUrl of getRpcUrls(chain)) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl, network, {
            staticNetwork: true,
          });

          // Add timeout to provider calls
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('RPC call timeout')), 10000);
          });

          const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

          const balanceOfFunc = contract.balanceOf;
          const decimalsFunc = contract.decimals;

          if (!balanceOfFunc || !decimalsFunc) {
            throw new Error('Contract functions not available');
          }

          const result = await Promise.race([
            Promise.all([
              balanceOfFunc(address) as Promise<bigint>,
              decimalsFunc() as Promise<number>,
            ]),
            timeoutPromise,
          ]) as [bigint, number];

          const [balance, decimals] = result;
          const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));

          cache.set(cacheKey, balanceFormatted);
          return balanceFormatted;
        } catch (error: any) {
          lastError = error;
          logger.warn(`RPC failed for ${chain} (${rpcUrl}): ${error?.message || error}`);
        }
      }

      logger.error(`All RPC endpoints failed for ${chain} token ${tokenSymbol}: ${lastError?.message || lastError}`);
      return 0;
    } catch (error: any) {
      logger.error(`Failed to get token balance for ${tokenSymbol} on ${chain}: ${error?.message || error}`);
      return 0;
    }
  }

  /**
   * Get all balances for a user across multiple chains
   */
  async getBalances(address: string): Promise<Asset[]> {
    const assets: Asset[] = [];
    
    // Define tokens to check per chain
    const tokensByChain: Record<Chain, Array<{ symbol: string; address?: string }>> = {
      ETH: [
        { symbol: 'ETH' }, // Native
        { symbol: 'USDC', ...(TOKEN_ADDRESSES.ETH.USDC ? { address: TOKEN_ADDRESSES.ETH.USDC } : {}) },
        { symbol: 'USDT', ...(TOKEN_ADDRESSES.ETH.USDT ? { address: TOKEN_ADDRESSES.ETH.USDT } : {}) },
      ],
      BSC: [
        { symbol: 'BNB' }, // Native (we'll use BNB as native)
        { symbol: 'USDT', ...(TOKEN_ADDRESSES.BSC.USDT ? { address: TOKEN_ADDRESSES.BSC.USDT } : {}) },
        { symbol: 'USDC', ...(TOKEN_ADDRESSES.BSC.USDC ? { address: TOKEN_ADDRESSES.BSC.USDC } : {}) },
      ],
      Solana: [],
      ZetaChain: [
        { symbol: 'ZETA' }, // Native
      ],
    };

    // Fetch balances in parallel
    const balancePromises: Promise<void>[] = [];

    for (const [chain, tokens] of Object.entries(tokensByChain)) {
      for (const token of tokens) {
        balancePromises.push(
          (async () => {
            let balance = 0;
            
            if (token.symbol === 'ETH' || token.symbol === 'BNB' || token.symbol === 'ZETA' || token.symbol === 'SOL') {
              balance = await this.getNativeBalance(chain as Chain, address);
            } else {
              balance = await this.getTokenBalance(
                chain as Chain,
                address,
                token.symbol,
                token.address
              );
            }

            if (balance > 0) {
              const asset: Asset = {
                symbol: token.symbol,
                balance,
                valueUSD: 0, // Will be calculated by price service
                chain: chain as Chain,
              };
              if (token.address) {
                asset.address = token.address;
              }
              assets.push(asset);
            }
          })()
        );
      }
    }

    await Promise.allSettled(balancePromises);

    return assets;
  }
}

export const chainDataService = new ChainDataService();
