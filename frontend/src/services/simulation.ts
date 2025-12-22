import type { StrategyOption, ExecutionPlan } from '@/types';

export interface SimulationResult {
  ok: boolean;
  estimatedGasUSD: number;
  estimatedSlippagePct: number;
  notes?: string[];
}

export const simulatePlan = async (plan: ExecutionPlan): Promise<SimulationResult> => {
  const spend = plan.steps.reduce((sum, step: any) => sum + (step.amount || 0), 0);
  return {
    ok: spend <= (plan.limits?.maxSpend || Infinity),
    estimatedGasUSD: Math.max(0.5, spend * 0.0005),
    estimatedSlippagePct: 0.3,
    notes: ['模拟模式：估算费用与滑点，仅用于演示'],
  };
};

export const assessRisk = (strategy: StrategyOption): number => {
  return strategy.risk;
};

