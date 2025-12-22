import { motion } from 'framer-motion';
import { useState } from 'react';
import { Wallet, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ZETA_TESTNET } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';

interface WalletInfoProps {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  onSwitchNetwork: () => Promise<{ success: boolean; error?: string }>;
}

export const WalletInfo = ({ address, balance, chainId, onSwitchNetwork }: WalletInfoProps) => {
  const { t } = useLanguage();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const isZetaTestnet = chainId === parseInt(ZETA_TESTNET.chainId, 16);

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    setSwitchError(null);
    
    try {
      const result = await onSwitchNetwork();
      if (!result.success) {
        setSwitchError(result.error || 'Failed to switch network');
      }
    } catch (error: any) {
      setSwitchError(error.message || 'Failed to switch network');
    } finally {
      setIsSwitching(false);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="px-4 mb-6 space-y-3">
      {/* Address & Status */}
      <div className="p-3 rounded-xl bg-secondary/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{t('dashboard.connected')}</p>
          <p className="text-sm font-mono truncate">{address ? shortenAddress(address) : '-'}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-success" />
      </div>

      {/* Network Status */}
      <motion.div 
        className={`p-3 rounded-xl flex items-center justify-between ${
          isZetaTestnet ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-2">
          {isZetaTestnet ? (
            <>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success">{t('dashboard.zetaTestnet')}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-destructive">{t('dashboard.wrongNetwork')}</span>
            </>
          )}
        </div>
        {!isZetaTestnet && (
          <div className="flex flex-col items-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
              onClick={handleSwitchNetwork}
              disabled={isSwitching}
            className="h-7 text-xs px-2"
          >
              {isSwitching ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
            <RefreshCw className="w-3 h-3 mr-1" />
            {t('dashboard.switchNetwork')}
                </>
              )}
          </Button>
            {switchError && (
              <p className="text-xs text-destructive/80 max-w-[120px] text-right">
                {switchError}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
