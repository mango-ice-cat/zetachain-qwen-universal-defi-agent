import type { ProtocolInfo, AssetOverview } from '@/types';

export const fetchAssetOverview = async (address: string): Promise<AssetOverview> => {
  return {
    totalsUSD: 12000,
    byChain: {
      ETH: { USDC: 5000, ETH: 1 },
      ZETA: { USDC: 2000, ZETA: 100 },
    },
  };
};

export const fetchProtocols = async (chains: string[]): Promise<ProtocolInfo[]> => {
  return [
    { id: 'aave-eth-usdc', chain: 'ETH', name: 'Aave V3', token: 'USDC', apy: 4.5, riskIndex: 2, address: '0xAave...' },
    { id: 'raydium-sol-usdc', chain: 'Solana', name: 'Raydium', token: 'USDC', apy: 12.0, riskIndex: 7, address: '0xRayd...' },
    { id: 'zeta-dex-usdc', chain: 'ZETA', name: 'Zeta DEX', token: 'USDC', apy: 7.8, riskIndex: 4, address: '0xZeta...' },
  ];
};

