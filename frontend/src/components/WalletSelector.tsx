import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { detectWallets, requestEip6963Providers, subscribeEip6963Providers, WalletProvider } from '@/utils/walletDetector';
import { useLanguage } from '@/contexts/LanguageContext';

interface WalletSelectorProps {
  onSelect: (wallet: WalletProvider) => void;
  onClose: () => void;
  isConnecting: boolean;
}

export const WalletSelector = ({ onSelect, onClose, isConnecting }: WalletSelectorProps) => {
  const { t } = useLanguage();
  const [wallets, setWallets] = useState<WalletProvider[]>([]);

  const renderWalletIcon = (icon?: string, name?: string) => {
    if (!icon) return <Wallet className="w-6 h-6 text-primary" />;
    const isImage = icon.startsWith('data:') || icon.startsWith('http');
    if (isImage) {
      return <img src={icon} alt={name || 'Wallet'} className="w-6 h-6" />;
    }
    // Avoid rendering long base64-ish strings as text
    if (icon.length > 6) return <Wallet className="w-6 h-6 text-primary" />;
    return <span aria-hidden="true">{icon}</span>;
  };

  useEffect(() => {
    const detectedWallets = detectWallets();
    setWallets(detectedWallets);
    const unsubscribe = subscribeEip6963Providers(setWallets);
    requestEip6963Providers();
    return unsubscribe;
  }, []);

  const handleWalletSelect = (wallet: WalletProvider) => {
    console.log('[WalletSelector] User selected wallet:', {
      id: wallet.id,
      name: wallet.name,
      isMetaMask: wallet.provider?.isMetaMask,
      isTokenPocket: wallet.provider?.isTokenPocket,
      provider: wallet.provider
    });
    onSelect(wallet);
  };

  if (wallets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <Card className="relative z-10 w-full max-w-md glass-strong">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Wallet</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No wallet detected. Please install a wallet extension.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md glass-strong">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Select Wallet</h2>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isConnecting}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <AnimatePresence>
              {wallets.map((wallet, index) => (
                <motion.button
                  key={wallet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleWalletSelect(wallet)}
                  disabled={isConnecting}
                  className="w-full p-4 rounded-xl glass hover:bg-secondary/50 transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                    {renderWalletIcon(wallet.icon, wallet.name)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{wallet.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wallet.isInstalled ? 'Installed' : 'Not installed'}
                    </p>
                  </div>
                  {isConnecting && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
