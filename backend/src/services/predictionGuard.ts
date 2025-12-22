import { StrategyOption } from '../../../shared/types';
import * as math from 'mathjs';

export interface SimulationResult {
  strategyId: string;
  scenarios: {
    bestCase: number;
    worstCase: number;
    mostLikely: number;
  };
  confidenceScore: number;
}

export class PredictionGuard {
  /**
   * Runs Monte Carlo simulation to predict yield outcomes based on volatility.
   */
  async simulateStrategy(strategy: StrategyOption): Promise<SimulationResult> {
    const iterations = 1000;
    const baseYield = strategy.expectedYield;
    const volatility = strategy.riskScore * 0.05; // Simplified volatility model

    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Random walk simulation
      const randomShock = (Math.random() - 0.5) * 2 * volatility;
      const simulatedYield = baseYield * (1 + randomShock);
      results.push(simulatedYield);
    }

    const sorted = results.sort((a, b) => a - b);
    // Add default values to handle empty or undefined results
    const worstCase = sorted[Math.floor(iterations * 0.05)] ?? baseYield; // 5th percentile
    const bestCase = sorted[Math.floor(iterations * 0.95)] ?? baseYield; // 95th percentile
    const mostLikely = results.length > 0 ? math.mean(results) : baseYield;

    return {
      strategyId: strategy.id,
      scenarios: {
        bestCase: Number(bestCase.toFixed(2)),
        worstCase: Number(worstCase.toFixed(2)),
        mostLikely: Number(mostLikely.toFixed(2))
      },
      confidenceScore: 0.85 // Mock confidence
    };
  }
}

export const predictionGuard = new PredictionGuard();
