import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronRight, Zap, Shield, TrendingUp, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { WalletSelector } from '@/components/WalletSelector';
import type { WalletProvider } from '@/utils/walletDetector';

interface LandingPageProps {
  onConnect: (wallet?: WalletProvider) => void;
  isConnecting: boolean;
  error: string | null;
}

export const LandingPage = ({ onConnect, isConnecting, error }: LandingPageProps) => {
  const { t } = useLanguage();
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  const handleConnectClick = () => {
    // Always show wallet selector, even if only one wallet is detected
    // This ensures user explicitly chooses which wallet to connect
    setShowWalletSelector(true);
  };

  const handleWalletSelect = (wallet: WalletProvider) => {
    setShowWalletSelector(false);
    // Pass the selected provider to onConnect
    onConnect(wallet);
  };

  const features = [
    {
      icon: Sparkles,
      titleKey: 'landing.feature.aiStrategy',
      descKey: 'landing.feature.aiStrategy.desc',
    },
    {
      icon: Zap,
      titleKey: 'landing.feature.crossChain',
      descKey: 'landing.feature.crossChain.desc',
    },
    {
      icon: Shield,
      titleKey: 'landing.feature.riskManagement',
      descKey: 'landing.feature.riskManagement.desc',
    },
    {
      icon: TrendingUp,
      titleKey: 'landing.feature.yieldOptimization',
      descKey: 'landing.feature.yieldOptimization.desc',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 noise-overlay" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-[100px]"
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ZetaYield</span>
        </motion.div>
        
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LanguageSwitcher />
          <Button 
            variant="glass" 
            onClick={handleConnectClick} 
            disabled={isConnecting}
            className="relative"
          >
            {isConnecting ? (
              <>
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/20"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Wallet className="w-4 h-4" />
                  </motion.div>
                  Connecting...
                </span>
              </>
            ) : (
              <>
            <Wallet className="w-4 h-4" />
            {t('landing.connectWallet')}
              </>
            )}
          </Button>
        </motion.div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 md:px-12 pt-16 md:pt-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {t('landing.tagline')}
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="gradient-text">{t('landing.title.1')}</span>
            <br />{t('landing.title.2')}
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {t('landing.description')}
          </motion.p>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 backdrop-blur-sm max-w-md mx-auto"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    {error.includes('MetaMask not installed') && (
                      <p className="text-xs text-destructive/80 mt-1">
                        Please install MetaMask extension to continue
                      </p>
                    )}
                    {error.includes('rejected') && (
                      <p className="text-xs text-destructive/80 mt-1">
                        Please approve the connection request in your wallet
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button 
              variant="gradient" 
              size="xl" 
              onClick={handleConnectClick}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              <AnimatePresence mode="wait">
                {isConnecting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    {t('landing.connecting')}
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    {t('landing.startOptimizing')}
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <Button variant="outline" size="xl" className="w-full sm:w-auto">
              {t('landing.learnMore')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
            >
              <Card variant="interactive" className="h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Flow Preview */}
        <motion.div
          className="mt-24 mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Card variant="glass" className="p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('landing.coreLoop')}</h2>
              <p className="text-muted-foreground">{t('landing.coreLoop.desc')}</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              {[
                { step: '01', titleKey: 'landing.step.input', descKey: 'landing.step.input.desc' },
                { step: '02', titleKey: 'landing.step.strategize', descKey: 'landing.step.strategize.desc' },
                { step: '03', titleKey: 'landing.step.execute', descKey: 'landing.step.execute.desc' },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl mb-3">
                      {item.step}
                    </div>
                    <h4 className="font-semibold">{t(item.titleKey)}</h4>
                    <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                  {index < 2 && (
                    <ChevronRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Wallet Selector Modal */}
      <AnimatePresence>
        {showWalletSelector && (
          <WalletSelector
            onSelect={handleWalletSelect}
            onClose={() => setShowWalletSelector(false)}
            isConnecting={isConnecting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
