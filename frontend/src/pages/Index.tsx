import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingPage } from '@/components/LandingPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useWallet } from '@/hooks/useWallet';
import type { WalletProvider } from '@/utils/walletDetector';
import { useStore } from '@/store/useStore';
import { LanguageProvider } from '@/contexts/LanguageContext';

const Index = () => {
  const wallet = useWallet();
  const { connectWallet, disconnectWallet, user } = useStore();
  const lastConnectedAddress = useRef<string | null>(null);

  const handleConnect = async (walletProvider?: WalletProvider) => {
    const result = await wallet.connect(true, walletProvider); // Auto-switch to ZetaChain testnet
    if (result.success && result.address) {
      // connectWallet will be called by useEffect
    }
  };

  const handleDisconnect = () => {
    wallet.disconnect();
    disconnectWallet();
    lastConnectedAddress.current = null;
  };

  // Sync wallet state with global store
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      const currentAddress = wallet.address.toLowerCase();
      const lastAddress = lastConnectedAddress.current?.toLowerCase();
      
      // Only connect if address changed or not connected in store
      if (!user || user.address.toLowerCase() !== currentAddress || lastAddress !== currentAddress) {
        lastConnectedAddress.current = wallet.address;
        connectWallet(wallet.address).catch(error => {
          console.error('Error connecting wallet to store:', error);
        });
      }
    } else if (!wallet.isConnected && user) {
      // Wallet disconnected, clean up store
      disconnectWallet();
      lastConnectedAddress.current = null;
    }
  }, [wallet.isConnected, wallet.address, connectWallet, disconnectWallet, user]);

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        {!wallet.isConnected ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage 
              onConnect={handleConnect} 
              isConnecting={wallet.isConnecting}
              error={wallet.error}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardLayout 
              onDisconnect={handleDisconnect}
              address={wallet.address}
              balance={wallet.balance}
              chainId={wallet.chainId}
              onSwitchNetwork={wallet.switchToZetaTestnet}
              getProvider={wallet.getProvider}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </LanguageProvider>
  );
};

export default Index;
