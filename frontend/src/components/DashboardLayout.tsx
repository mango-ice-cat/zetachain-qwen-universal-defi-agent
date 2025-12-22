import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  LogOut,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ChatInterface } from '@/components/ChatInterface';
import { StrategyPreview } from '@/components/StrategyPreview';
import { executeStrategyOnChain } from '@/services/strategyExecutor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonitoringDashboard } from '@/components/MonitoringDashboard';
import { WalletInfo } from '@/components/WalletInfo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@shared/utils';
import { StrategyOption } from '@shared/types';

type View = 'strategy' | 'monitoring';

interface DashboardLayoutProps {
  onDisconnect: () => void;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  onSwitchNetwork: () => Promise<{ success: boolean; error?: string }>;
  getProvider: () => any;
}

export const DashboardLayout = ({ 
  onDisconnect, 
  address, 
  balance, 
  chainId,
  onSwitchNetwork,
  getProvider
}: DashboardLayoutProps) => {
  const { t } = useLanguage();
  const { execution, strategies, assets, isLoading } = useStore();
  const [currentView, setCurrentView] = useState<View>('strategy');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExecutionConfirm, setShowExecutionConfirm] = useState(false);
  const [localExecutionError, setLocalExecutionError] = useState<string | null>(null);
  const [isExecutingOnChain, setIsExecutingOnChain] = useState(false);
  const [amountConfirmed, setAmountConfirmed] = useState(false);

  // Get the selected strategy from store
  const selectedStrategy = selectedStrategyId 
    ? strategies.find(s => s.id === selectedStrategyId) || null
    : null;

  const handleStrategyGenerated = (newStrategy: any) => {
    // newStrategy is the preview format, but we need to find the original StrategyOption
    // The preview is generated from the first strategy in the store
    // Wait a bit for strategies to be updated in the store
    setTimeout(() => {
      const currentStrategies = useStore.getState().strategies;
      if (currentStrategies.length > 0) {
        setSelectedStrategyId(currentStrategies[0].id);
      }
    }, 100);
  };

  const handleConfirmStrategy = async () => {
    if (!selectedStrategy) {
      console.error('No strategy selected to execute');
      return;
    }

    setShowExecutionConfirm(true);
  };

  const handleAdjustStrategy = () => {
    setSelectedStrategyId(null);
  };

  const handleExecuteOnChain = async () => {
    if (!selectedStrategy || !address) return;
    setIsExecutingOnChain(true);
    setLocalExecutionError(null);
    try {
      await executeStrategyOnChain(address, selectedStrategy.steps, getProvider());
      setCurrentView('monitoring');
    } catch (error: any) {
      setLocalExecutionError(error?.message || 'Failed to execute strategy');
    } finally {
      setIsExecutingOnChain(false);
      setShowExecutionConfirm(false);
    }
  };

  const handleContinueExecution = () => {
    if (isExecutingOnChain) return;
    if (!selectedStrategy) {
      if (strategies.length === 0) return;
      setSelectedStrategyId(strategies[0].id);
      setTimeout(() => setShowExecutionConfirm(true), 0);
      return;
    }
    setShowExecutionConfirm(true);
  };

  useEffect(() => {
    if (showExecutionConfirm) {
      setAmountConfirmed(false);
    }
  }, [showExecutionConfirm, selectedStrategy?.id]);

  const formatAmount = (amount: number) =>
    amount.toLocaleString(undefined, { maximumFractionDigits: 6 });

  const navItems = [
    { id: 'strategy' as View, icon: MessageSquare, labelKey: 'dashboard.aiStrategy' },
    { id: 'monitoring' as View, icon: LayoutDashboard, labelKey: 'dashboard.monitoring' },
  ];

  const amountSteps = useMemo(
    () => selectedStrategy?.steps.filter((step) => (
      step.type === 'bridge' || step.type === 'swap' || step.type === 'withdraw'
    )) ?? [],
    [selectedStrategy?.steps],
  );

  const getStepSourceAsset = (step: StrategyOption['steps'][number]) => {
    if (step.type === 'swap' && step.asset.includes('->')) {
      return step.asset.split('->')[0];
    }
    return step.asset;
  };

  const balanceCheck = useMemo(() => {
    if (!assets?.byChain || amountSteps.length === 0) {
      return { issues: [], unknown: [] as string[] };
    }

    const issues: Array<{ label: string; required: number; balance: number }> = [];
    const unknown: string[] = [];

    amountSteps.forEach((step) => {
      const symbol = getStepSourceAsset(step);
      const chainBalances = assets.byChain[step.fromChain];
      const balance = chainBalances ? chainBalances[symbol] : undefined;
      if (typeof balance !== 'number') {
        unknown.push(`${symbol} @ ${step.fromChain}`);
        return;
      }
      if (step.amount > balance) {
        issues.push({ label: `${symbol} @ ${step.fromChain}`, required: step.amount, balance });
      }
    });

    return { issues, unknown };
  }, [amountSteps, assets]);

  return (
    <div className="min-h-screen flex relative">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />
      <div className="fixed inset-0 noise-overlay pointer-events-none" />

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glass"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(sidebarOpen || mobileMenuOpen) && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              fixed lg:relative z-40 h-screen w-64 glass-strong flex flex-col
              ${mobileMenuOpen ? 'block' : 'hidden lg:flex'}
            `}
          >
            {/* Logo */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">ZetaYield</span>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="px-4 mb-4">
              <LanguageSwitcher />
            </div>

            {/* Wallet Info */}
            <WalletInfo 
              address={address}
              balance={balance}
              chainId={chainId}
              onSwitchNetwork={onSwitchNetwork}
            />

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${currentView === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </button>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                <Settings className="w-5 h-5" />
                <span>{t('dashboard.settings')}</span>
              </button>
              <button 
                onClick={onDisconnect}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('dashboard.disconnect')}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Toggle (Desktop) */}
      <button
        className="hidden lg:flex fixed left-64 top-1/2 -translate-y-1/2 z-30 w-6 h-12 items-center justify-center rounded-r-lg glass hover:bg-secondary transition-colors"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ left: sidebarOpen ? '256px' : '0' }}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Main Content */}
      <main className={`flex-1 relative z-10 p-4 lg:p-8 transition-all ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}`}>
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {currentView === 'strategy' ? (
              <motion.div
                key="strategy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <header className="mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('dashboard.strategyGenerator')}</h1>
                  <p className="text-muted-foreground">
                    {t('dashboard.strategyGenerator.desc')}
                  </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                  <ChatInterface onStrategyGenerated={handleStrategyGenerated} />
                  <div className="flex flex-col gap-6 h-full">
                    <Card variant="glass">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('dashboard.portfolioAssets')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="text-sm text-muted-foreground">
                            {t('dashboard.loadingAssets')}
                          </div>
                        ) : assets?.assets?.length ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('dashboard.totalValue')}</span>
                              <span className="font-semibold">{formatCurrency(assets.totalsUSD)}</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(
                                assets.assets.reduce((acc, asset) => {
                                  if (!acc[asset.chain]) acc[asset.chain] = { total: 0, items: [] as typeof assets.assets };
                                  acc[asset.chain].total += asset.valueUSD;
                                  acc[asset.chain].items.push(asset);
                                  return acc;
                                }, {} as Record<string, { total: number; items: typeof assets.assets }>)
                              ).map(([chain, data]) => (
                                <div key={chain} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground uppercase">{chain}</span>
                                    <span className="font-medium">{formatCurrency(data.total)}</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {data.items.map((asset) => (
                                      <div key={`${chain}-${asset.symbol}`} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                          {asset.symbol} {asset.balance.toLocaleString(undefined, { maximumFractionDigits: asset.balance < 1 ? 6 : 2 })}
                                        </span>
                                        <span className="font-medium">{formatCurrency(asset.valueUSD)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {t('dashboard.noAssetsFound')}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <StrategyPreview 
                      strategy={selectedStrategy ? {
                        primary: { 
                          name: selectedStrategy.label, 
                          protocol: selectedStrategy.steps[0]?.protocol || '通用协议', 
                          apy: selectedStrategy.expectedYield, 
                          allocation: 60 
                        },
                        secondary: { 
                          name: '辅助策略', 
                          protocol: 'Zeta Earn',
                          apy: selectedStrategy.expectedYield * 0.8, 
                          allocation: 30 
                        },
                        hedge: { name: 'USDC 储备', allocation: 10 },
                        riskLevel: selectedStrategy.riskScore <= 3 ? 'low' : selectedStrategy.riskScore <= 7 ? 'medium' : 'high',
                        expectedYield: { 
                          min: Math.max(0, selectedStrategy.expectedYield - 2), 
                          max: selectedStrategy.expectedYield + 2 
                        }
                      } : null} 
                      onConfirm={handleConfirmStrategy}
                      onAdjust={handleAdjustStrategy}
                    isExecuting={isExecutingOnChain || execution.isExecuting}
                    executionError={localExecutionError || execution.error}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="monitoring"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <header className="mb-8 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('dashboard.realtimeMonitoring')}</h1>
                    <p className="text-muted-foreground">
                      {t('dashboard.realtimeMonitoring.desc')}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentView('strategy')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('dashboard.adjustStrategy')}
                  </Button>
                </header>

                <MonitoringDashboard onContinueExecution={handleContinueExecution} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AlertDialog open={showExecutionConfirm} onOpenChange={setShowExecutionConfirm}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认执行跨链策略</AlertDialogTitle>
            <AlertDialogDescription>
              你将依次执行以下步骤（需要多次钱包签名）：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border/60 px-3 py-2 text-sm">
            <div className="text-xs text-muted-foreground">实际执行金额</div>
            <div className="mt-2 space-y-2">
              {amountSteps.length === 0 ? (
                <div className="text-xs text-muted-foreground">暂无需要确认的金额步骤</div>
              ) : (
                amountSteps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between">
                    <span className="font-medium">{formatAmount(step.amount)} {getStepSourceAsset(step)}</span>
                    <span className="text-xs text-muted-foreground">{step.fromChain} → {step.toChain}</span>
                  </div>
                ))
              )}
            </div>
            {balanceCheck.issues.length > 0 && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                余额不足，无法执行：
                {balanceCheck.issues.map((issue) => (
                  <div key={issue.label}>
                    {issue.label} 需要 {formatAmount(issue.required)}，余额 {formatAmount(issue.balance)}
                  </div>
                ))}
              </div>
            )}
            {balanceCheck.unknown.length > 0 && balanceCheck.issues.length === 0 && (
              <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-warning">
                部分资产余额无法校验：{balanceCheck.unknown.join('，')}
              </div>
            )}
            <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                id="confirm-amount"
                checked={amountConfirmed}
                onCheckedChange={(checked) => setAmountConfirmed(Boolean(checked))}
              />
              <span>我已确认金额无误</span>
            </label>
          </div>
          <div className="space-y-2 text-sm">
            {selectedStrategy?.steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <span>Step {index + 1}: {step.type.toUpperCase()}</span>
                <span className="text-muted-foreground">{step.fromChain} → {step.toChain}</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecutingOnChain}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteOnChain}
              disabled={isExecutingOnChain || !amountConfirmed || balanceCheck.issues.length > 0}
            >
              {isExecutingOnChain ? '执行中...' : '确认执行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
