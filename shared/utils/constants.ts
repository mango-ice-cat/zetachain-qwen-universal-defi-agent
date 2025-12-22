import { Chain } from '../types';

export const CHAINS: Record<Chain, number> = {
  ETH: 11155111, // Sepolia Testnet
  BSC: 97, // BSC Testnet
  Solana: 999999, // Placeholder (Solana uses different chain ID system)
  ZetaChain: 7001, // ZetaChain Athens Testnet (0x1B59)
};

export const SUPPORTED_CHAINS: Chain[] = ['ETH', 'BSC', 'Solana', 'ZetaChain'];

export const API_ENDPOINTS = {
  COINGECKO: 'https://api.coingecko.com/api/v3',
  ZETA_RPC: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
};

export const RISK_LEVELS = {
  LOW: { min: 0, max: 3, label: 'Low Risk' },
  MEDIUM: { min: 4, max: 7, label: 'Medium Risk' },
  HIGH: { min: 8, max: 10, label: 'High Risk' },
};
