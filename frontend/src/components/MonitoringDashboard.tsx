import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Check, 
  Clock,
  DollarSign,
  BarChart3,
  Pause,
  Play,
  RefreshCw,
  Bell,
  X,
  Coins,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatPercentage } from '@shared/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackCctx } from '@/services/api';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

interface MonitoringDashboardProps {
  onContinueExecution?: () => void;
}

export const MonitoringDashboard = ({ onContinueExecution }: MonitoringDashboardProps) => {
  const { assets, protocols, isLoading, loadData, executionLog, strategies, updateExecutionTx } = useStore();
  const { t } = useLanguage();
  
  const [isPaused, setIsPaused] = useState(false);
  const [earnedToday, setEarnedToday] = useState(2.03); // Mock for now
  const pendingBridgeChecks = useRef(new Set<string>());
  const hasIncomplete = executionLog.some((tx) => tx.status !== 'completed');
  const groupedLogs = useMemo(() => {
    const groups = new Map<string, typeof executionLog>();
    executionLog.forEach((tx) => {
      const key = tx.runId || tx.id;
      const existing = groups.get(key);
      if (existing) {
        existing.push(tx);
      } else {
        groups.set(key, [tx]);
      }
    });
    return Array.from(groups.entries()).map(([runId, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
      const title = sorted[sorted.length - 1]?.description || '执行任务';
      const status = sorted.some(tx => tx.status === 'failed')
        ? 'failed'
        : sorted.some(tx => tx.status === 'pending')
          ? 'pending'
          : 'completed';
      return { runId, items: sorted, title, status };
    }).sort((a, b) => b.items[0].timestamp - a.items[0].timestamp);
  }, [executionLog]);
  
  // Derived state from store
  const totalValue = assets?.totalsUSD || 0;
  const avgApy = protocols.length > 0 
    ? protocols.reduce((sum, p) => sum + p.apy, 0) / protocols.length 
    : 0;

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'info', message: '', timestamp: new Date(Date.now() - 3600000) },
  ]);
  
  useEffect(() => {
    // Update alert message with translation
    setAlerts([
      { id: '1', type: 'info', message: t('dashboard.strategyExecutionStarted'), timestamp: new Date(Date.now() - 3600000) },
  ]);
  }, [t]);

  useEffect(() => {
    const pendingBridges = executionLog.filter(
      (tx) => tx.status === 'pending' && tx.description?.toLowerCase().includes('bridge')
    );
    if (pendingBridges.length === 0) return;

    pendingBridges.forEach(async (tx) => {
      if (pendingBridgeChecks.current.has(tx.id)) return;
      pendingBridgeChecks.current.add(tx.id);
      try {
        const result = await trackCctx(tx.hash, 30);
        if (result.status === 'completed') {
          updateExecutionTx(tx.id, { status: 'completed' });
        } else if (result.status === 'failed') {
          updateExecutionTx(tx.id, { status: 'failed' });
        }
      } catch {
        // ignore and allow retry on next render
      } finally {
        pendingBridgeChecks.current.delete(tx.id);
      }
    });
  }, [executionLog, updateExecutionTx]);

  // Convert executionLog to transactions format
  const transactions = executionLog.map((tx) => ({
    id: tx.id,
    type: tx.description || 'Transaction',
    protocol: `Chain ${tx.chainId}`,
    amount: '0.00', // Amount not available in executionLog
    status: tx.status as 'completed' | 'pending' | 'failed',
  }));

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'pending': return 'text-warning';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-warning/50 bg-warning/10';
      case 'success': return 'border-success/50 bg-success/10';
      default: return 'border-primary/50 bg-primary/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('dashboard.totalValue')}</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <motion.p 
              className="text-2xl font-bold"
              key={totalValue}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              {formatCurrency(totalValue)}
            </motion.p>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +2.4% {t('dashboard.percentFromStart')}
            </p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('dashboard.avgApy')}</span>
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <motion.p 
              className="text-2xl font-bold gradient-text"
              key={avgApy}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              {formatPercentage(avgApy)}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.acrossAllPositions')}</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('dashboard.earnedToday')}</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <motion.p 
              className="text-2xl font-bold text-success"
              key={earnedToday}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              +{formatCurrency(earnedToday)}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.autoCompounding')}</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('dashboard.status')}</span>
              <Activity className={`w-4 h-4 ${isPaused ? 'text-warning' : 'text-success'}`} />
            </div>
            <p className={`text-2xl font-bold ${isPaused ? 'text-warning' : 'text-success'}`}>
              {isPaused ? t('dashboard.paused') : t('dashboard.active')}
            </p>
            <div className="flex gap-2 mt-2">
              <Button 
                variant={isPaused ? 'gradient' : 'outline'} 
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                {isPaused ? t('dashboard.resume') : t('dashboard.pause')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-3 rounded-lg border flex items-center justify-between ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-center gap-3">
                <Bell className={`w-4 h-4 ${
                  alert.type === 'warning' ? 'text-warning' : 
                  alert.type === 'success' ? 'text-success' : 'text-primary'
                }`} />
                <span className="text-sm">{alert.message}</span>
              </div>
              <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-background/20 rounded">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assets List */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t('dashboard.portfolioAssets')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              {t('dashboard.loadingAssets')}
            </div>
          ) : assets && assets.assets && assets.assets.length > 0 ? (
            <div className="space-y-4">
              {/* Group assets by chain */}
              {Object.entries(
                assets.assets.reduce((acc, asset) => {
                  if (!acc[asset.chain]) acc[asset.chain] = [];
                  acc[asset.chain].push(asset);
                  return acc;
                }, {} as Record<string, typeof assets.assets>)
              ).map(([chain, chainAssets], chainIndex) => (
                <motion.div
                  key={chain}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: chainIndex * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">{chain}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({chainAssets.length} {chainAssets.length === 1 ? t('dashboard.asset') : t('dashboard.assets')})
                    </span>
                  </div>
                  <div className="space-y-2 pl-4">
                    {chainAssets.map((asset, assetIndex) => (
                      <motion.div
                        key={`${asset.chain}-${asset.symbol}-${assetIndex}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (chainIndex * 0.1) + (assetIndex * 0.05) }}
                        className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{asset.symbol}</p>
                                {asset.address && (
                                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                                    {asset.address.slice(0, 6)}...{asset.address.slice(-4)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t('dashboard.balance')}: {asset.balance.toLocaleString(undefined, { 
                                  maximumFractionDigits: asset.balance < 1 ? 6 : 2 
                                })} {asset.symbol}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm gradient-text">
                              {formatCurrency(asset.valueUSD)}
                            </p>
                            {totalValue > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {((asset.valueUSD / totalValue) * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
              
              {/* Summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 pt-4 border-t border-border/50"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.totalAssets')}: {assets.assets.length}</span>
                  <span className="font-semibold">{t('dashboard.totalValueLabel')}: {formatCurrency(totalValue)}</span>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <Coins className="w-12 h-12 mb-3 opacity-50" />
              <p>{t('dashboard.noAssetsFound')}</p>
              <p className="text-xs mt-1">{t('dashboard.connectWalletToView')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Log */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">交易记录</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {executionLog.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无执行记录</div>
          ) : (
            <div className="space-y-3">
              {groupedLogs.map((group) => (
                <Collapsible key={group.runId} className="rounded-lg glass border border-border/60">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(group.status)}`}>
                          {getStatusIcon(group.status)}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{group.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.items.length} 笔交易 · {new Date(group.items[0].timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">展开详情</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/60">
                    <div className="space-y-2 p-3">
                      {group.items.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getStatusColor(tx.status)}`}>
                              {getStatusIcon(tx.status)}
                            </div>
                            <div>
                              <div className="font-medium">{tx.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)} · Chain {tx.chainId}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
          {executionLog.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <div className="text-xs text-muted-foreground">
                {hasIncomplete ? '存在未完成步骤，可继续执行。' : '全部步骤已完成。'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onContinueExecution}
                disabled={!hasIncomplete || !onContinueExecution}
              >
                继续执行未完成步骤
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dashboard.recentTransactions')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(tx.status)} bg-current/10`}>
                    {getStatusIcon(tx.status)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.protocol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{tx.amount}</p>
                  <p className={`text-xs ${getStatusColor(tx.status)}`}>
                    {tx.status === 'completed' ? t('dashboard.completed') : 
                     tx.status === 'pending' ? t('dashboard.pending') : 
                     t('dashboard.failed')}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Strategy Preview (Replaces Chart Placeholder) */}
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('dashboard.generatedStrategies')}</CardTitle>
          </CardHeader>
          <CardContent>
            {strategies.length > 0 ? (
              <div className="space-y-3">
                {strategies.map(strategy => (
                  <div key={strategy.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
                     <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold text-sm">{strategy.label}</p>
                         <p className="text-xs text-muted-foreground">{strategy.description}</p>
                       </div>
                       <span className="text-success font-bold text-sm">{strategy.expectedYield}% APY</span>
                     </div>
                     <div className="mt-2 text-xs opacity-80">
                       {t('dashboard.riskScore')}: {strategy.riskScore}/10
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {t('dashboard.noActiveStrategies')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
