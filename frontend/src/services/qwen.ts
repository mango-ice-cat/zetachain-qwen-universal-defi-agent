import type { Intent, StrategyOption, ExecutionPlan } from '@/types';

export const parseIntent = async (text: string): Promise<Intent> => {
  return {
    goal: 'maximize_yield',
    riskMax: 5,
    budget: { amount: 10000, token: 'USDC' },
    chains: ['ETH', 'ZETA'],
    constraints: { slippage: 0.5, whitelist: ['Aave', 'Raydium'], maxSpend: 10000 },
  };
};

export const generateStrategies = async (
  intent: Intent,
): Promise<StrategyOption[]> => {
  return [
    {
      label: '保守',
      action: 'deposit',
      fromChain: 'ETH',
      toChain: 'ETH',
      contract: '0xAaveV3...',
      params: { amount: 5000, approve: true },
      expectedYield: 4.2,
      risk: 2,
      rationale: 'Aave 低风险稳定收益',
    },
    {
      label: '平衡',
      action: 'lp',
      fromChain: 'ETH',
      toChain: 'ZETA',
      contract: '0xZetaDEX...',
      params: { amount: 3000, approve: true },
      expectedYield: 7.1,
      risk: 4,
      rationale: '部分做 LP 获取更高收益',
    },
    {
      label: '激进',
      action: 'borrowThenLP',
      fromChain: 'ETH',
      toChain: 'Solana',
      contract: '0xRaydium...',
      params: { amount: 2000, approve: true },
      expectedYield: 10.5,
      risk: 6,
      rationale: '跨链至高 APY，但风险更高',
    },
  ];
};

export const buildExecutionPlan = async (
  chosen: StrategyOption,
  intent: Intent,
): Promise<ExecutionPlan> => {
  const steps: ExecutionPlan['steps'] = [];
  if (chosen.params.approve) {
    steps.push({
      type: 'approve',
      token: intent.budget?.token || 'USDC',
      amount: chosen.params.amount,
    });
  }
  if (chosen.fromChain !== chosen.toChain) {
    steps.push({
      type: 'xTransfer',
      token: intent.budget?.token || 'USDC',
      from: chosen.fromChain,
      to: chosen.toChain,
      amount: chosen.params.amount,
    });
  }
  steps.push({
    type: 'contractCall',
    chain: chosen.toChain,
    contract: chosen.contract || '',
    method: chosen.action === 'deposit' ? 'deposit' : 'execute',
    args: [chosen.params.amount],
  });
  return {
    steps,
    limits: {
      maxSpend: intent.constraints?.maxSpend,
      deadline: Math.floor(Date.now() / 1000) + (intent.constraints?.deadlineSeconds || 900),
    },
  };
};

