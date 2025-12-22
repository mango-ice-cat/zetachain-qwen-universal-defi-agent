// Core Entity Definitions

export type Chain = 'ETH' | 'Solana' | 'BSC' | 'ZetaChain';

export interface Asset {
  symbol: string;
  balance: number;
  valueUSD: number;
  chain: Chain;
  address?: string; // Contract address
}

export interface AssetOverview {
  totalsUSD: number;
  byChain: Record<string, Record<string, number>>; // chain -> token -> amount
  assets: Asset[]; // Detailed list
}

export interface ProtocolInfo {
  id: string;
  name: string;
  chain: Chain;
  token: string;
  apy: number;
  riskIndex: number; // 1-10, 10 is highest risk
  tvl?: number;
  address: string;
}

// AI Strategy & Intent

export interface Intent {
  goal: 'maximize_yield' | 'minimize_risk' | 'balanced' | 'custom';
  riskMax: number; // 1-10
  chains: Chain[];
  minApy?: number;
  specificToken?: string;
}

export interface StrategyStep {
  id: string;
  type: 'bridge' | 'swap' | 'deposit' | 'withdraw' | 'stake';
  protocol?: string;
  fromChain: Chain;
  toChain: Chain;
  asset: string;
  amount: number;
  targetAddress?: string; // Contract interaction target
  data?: string; // Encoded transaction data (if ready)
  status: 'pending' | 'signed' | 'broadcasted' | 'success' | 'failed';
  txHash?: string;
}

export interface StrategyOption {
  id: string;
  label: string;
  description: string;
  actions: string; // High level description like "borrowThenLP"
  steps: StrategyStep[]; // Detailed execution steps
  expectedYield: number;
  riskScore: number;
  rationale: string;
}

// User & Session

export interface UserProfile {
  address: string; // Wallet address (connected via Zeta/MetaMask)
  preferences: {
    riskTolerance: number;
    favChains: Chain[];
  };
}

// API Responses

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
