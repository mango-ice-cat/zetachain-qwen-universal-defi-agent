import { motion } from 'framer-motion';
import { TrendingUp, Shield, AlertTriangle, Check, ChevronRight, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Strategy {
  primary: { name: string; protocol: string; apy: number; allocation: number };
  secondary: { name: string; protocol: string; apy: number; allocation: number };
  hedge: { name: string; allocation: number };
  riskLevel: string;
  expectedYield: { min: number; max: number };
}

interface StrategyPreviewProps {
  strategy: Strategy | null;
  onConfirm: () => void;
  onAdjust: () => void;
  isExecuting?: boolean;
  executionError?: string | null;
}

export const StrategyPreview = ({ strategy, onConfirm, onAdjust, isExecuting, executionError }: StrategyPreviewProps) => {
  if (!strategy) {
    return (
      <Card variant="glass" className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无策略</h3>
          <p className="text-sm text-muted-foreground">
            请与 AI 对话以生成个性化的收益策略。
          </p>
        </div>
      </Card>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success';
      case 'medium-low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const allocations = [
    { name: strategy.primary.name, value: strategy.primary.allocation, color: 'bg-primary' },
    { name: strategy.secondary.name, value: strategy.secondary.allocation, color: 'bg-accent' },
    { name: strategy.hedge.name, value: strategy.hedge.allocation, color: 'bg-secondary' },
  ];

  return (
    <Card variant="glow" className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            AI Strategy Preview
          </CardTitle>
          <span className={`flex items-center gap-1 text-sm ${getRiskColor(strategy.riskLevel)}`}>
            <Shield className="w-4 h-4" />
            {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Expected Yield */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Expected Annual Yield</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold gradient-text">
              {strategy.expectedYield.min}% - {strategy.expectedYield.max}%
            </span>
            <span className="text-sm text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> APY
            </span>
          </div>
        </div>

        {/* Allocation Chart */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Portfolio Allocation</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {allocations.map((item, index) => (
              <motion.div
                key={item.name}
                className={`${item.color} h-full`}
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {allocations.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Details */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Strategy Components</p>
          
          <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">{strategy.primary.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.primary.protocol}</p>
              </div>
            </div>
            <span className="text-success font-semibold">{strategy.primary.apy}% APY</span>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">{strategy.secondary.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.secondary.protocol}</p>
              </div>
            </div>
            <span className="text-success font-semibold">{strategy.secondary.apy}% APY</span>
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">风险提示</p>
            <p className="text-xs text-muted-foreground">
              DeFi 投资存在风险。过往表现不代表未来收益。
            </p>
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <div className="p-6 pt-0 flex gap-3">
        <Button variant="outline" onClick={onAdjust} className="flex-1" disabled={isExecuting}>
          <Clock className="w-4 h-4" />
          调整
        </Button>
        <Button variant="gradient" onClick={onConfirm} className="flex-1" disabled={isExecuting}>
          <Check className="w-4 h-4" />
          {isExecuting ? '执行中...' : '执行策略'}
        </Button>
      </div>
      {executionError && (
        <div className="px-6 pb-6 text-xs text-destructive">
          {executionError}
        </div>
      )}
    </Card>
  );
};
