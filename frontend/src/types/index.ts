export type RiskLevel = 'low' | 'medium-low' | 'medium' | 'high';

export interface Intent {
  goal: 'maximize_yield' | 'minimize_risk' | 'balance';
  riskMax?: number;
  budget?: { amount: number; token: string };
  chains?: string[];
  constraints?: {
    slippage?: number;
    whitelist?: string[];
    deadlineSeconds?: number;
    maxSpend?: number;
  };
}

export interface AssetOverview {
  totalsUSD: number;
  byChain: Record<string, Record<string, number>>;
}

export interface ProtocolInfo {
  id: string;
  chain: string;
  name: string;
  token?: string;
  apy: number;
  riskIndex: number;
  address?: string;
}

export interface StrategyOption {
  label: string;
  action: 'deposit' | 'stake' | 'lp' | 'borrowThenLP';
  fromChain: string;
  toChain: string;
  contract?: string;
  params: { amount: number; approve?: boolean };
  expectedYield: number;
  risk: number;
  rationale: string;
}

export interface ExecutionStepApprove {
  type: 'approve';
  token: string;
  amount: number;
}

export interface ExecutionStepXTransfer {
  type: 'xTransfer';
  token: string;
  from: string;
  to: string;
  amount: number;
}

export interface ExecutionStepContractCall {
  type: 'contractCall';
  chain: string;
  contract: string;
  method: string;
  args: any[];
}

export type ExecutionStep =
  | ExecutionStepApprove
  | ExecutionStepXTransfer
  | ExecutionStepContractCall;

export interface ExecutionPlan {
  steps: ExecutionStep[];
  limits?: {
    maxSpend?: number;
    deadline?: number;
  };
}

export type TxStatus = 'pending' | 'success' | 'failed';

export interface ExecutionReceipt {
  txs: string[];
  gasUsed?: number;
  status: TxStatus;
  logs?: string[];
}

