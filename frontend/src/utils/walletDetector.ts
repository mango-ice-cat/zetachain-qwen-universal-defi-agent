// Wallet detection utility
// Detects all available wallet providers in the browser

export interface WalletProvider {
  id: string;
  name: string;
  icon?: string;
  provider: any; // The actual provider object
  isInstalled: boolean;
  source?: string;
  rdns?: string;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name?: string;
  icon?: string;
  rdns?: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: any;
}

// Known wallet identifiers
const WALLET_INFO: Record<string, { name: string; icon?: string }> = {
  'MetaMask': { name: 'MetaMask', icon: '🦊' },
  'TokenPocket': { name: 'TokenPocket', icon: '💼' },
  'CoinbaseWallet': { name: 'Coinbase Wallet', icon: '🔷' },
  'TrustWallet': { name: 'Trust Wallet', icon: '🛡️' },
  'imToken': { name: 'imToken', icon: '🔐' },
  'OKX': { name: 'OKX Wallet', icon: '⚡' },
  'BitKeep': { name: 'BitKeep', icon: '📦' },
};

const eip6963Providers = new Map<string, Eip6963ProviderDetail>();

function mapEip6963InfoToId(info: Eip6963ProviderInfo, provider: any): { id: string; name: string; icon?: string } {
  if (info?.rdns?.includes('metamask')) {
    return { id: 'MetaMask', name: 'MetaMask', icon: WALLET_INFO['MetaMask']?.icon };
  }
  if (info?.rdns?.includes('tokenpocket')) {
    return { id: 'TokenPocket', name: 'TokenPocket', icon: WALLET_INFO['TokenPocket']?.icon };
  }
  if (info?.rdns?.includes('okx')) {
    return { id: 'OKX', name: 'OKX Wallet', icon: WALLET_INFO['OKX']?.icon };
  }
  if (info?.name) {
    return { id: info.name, name: info.name, icon: info.icon };
  }
  const detected = detectWalletType(provider);
  const walletInfo = WALLET_INFO[detected.id];
  return { id: detected.id, name: walletInfo?.name || detected.name, icon: walletInfo?.icon || info?.icon };
}

export function requestEip6963Providers(): void {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

export function subscribeEip6963Providers(onUpdate: (wallets: WalletProvider[]) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.info?.uuid || !detail?.provider) return;
    eip6963Providers.set(detail.info.uuid, detail);
    onUpdate(detectWallets());
  };

  window.addEventListener('eip6963:announceProvider', handler as EventListener);
  return () => {
    window.removeEventListener('eip6963:announceProvider', handler as EventListener);
  };
}

/**
 * Helper function to detect wallet type from provider
 */
function detectWalletType(provider: any): { id: string; name: string } {
  // console.log('钱包类型：'+JSON.stringify(provider));
  if (provider.isMetaMask && !provider.isTokenPocket && !provider.isOKExWallet) {
    return { id: 'MetaMask', name: 'MetaMask' };
  } else if (provider.isTokenPocket) {
    return { id: 'TokenPocket', name: 'TokenPocket' };
  } else if (provider.isCoinbaseWallet) {
    return { id: 'CoinbaseWallet', name: 'Coinbase Wallet' };
  } else if (provider.isTrust) {
    return { id: 'TrustWallet', name: 'Trust Wallet' };
  } else if (provider.isImToken) {
    return { id: 'imToken', name: 'imToken' };
  } else if (provider.isOKExWallet) {
    return { id: 'OKX', name: 'OKX Wallet' };
  } else if (provider.isBitKeep) {
    return { id: 'BitKeep', name: 'BitKeep' };
  } else {
    // Try to detect from provider info
    const providerInfo = (provider as any).providerInfo || (provider as any).info || (provider as any).provider;
    if (providerInfo) {
      const name = providerInfo.name || 'Ethereum Wallet';
      return { id: name, name };
    }
    return { id: 'Unknown', name: 'Ethereum Wallet' };
  }
}

/**
 * Detects all available wallet providers
 * Priority: providers array > window.metamask > window.ethereum
 */
export function detectWallets(): WalletProvider[] {
  const wallets: WalletProvider[] = [];
  const seenProviders = new Set<any>(); // Track providers to avoid duplicates
  const seenWalletIds = new Set<string>(); // Prevent duplicate wallet entries by id

  console.log('[WalletDetector] Starting wallet detection...');

  const addWallet = (wallet: WalletProvider) => {
    if (seenWalletIds.has(wallet.id)) {
      return;
    }
    seenWalletIds.add(wallet.id);
    wallets.push(wallet);
  };

  // Priority 0: EIP-6963 announced providers
  eip6963Providers.forEach(detail => {
    const provider = detail.provider;
    if (!provider || seenProviders.has(provider)) return;
    const mapped = mapEip6963InfoToId(detail.info, provider);
    addWallet({
      id: mapped.id,
      name: mapped.name,
      icon: mapped.icon,
      provider,
      isInstalled: true,
      source: 'eip6963',
      rdns: detail.info.rdns,
    });
    seenProviders.add(provider);
  });

  // Priority 1: Check window.ethereum.providers (EIP-6963 - multiple wallets)
  // This is the most reliable way to detect multiple wallets
  if ((window.ethereum as any)?.providers && Array.isArray((window.ethereum as any).providers)) {
    console.log('[WalletDetector] Found providers array:', (window.ethereum as any).providers.length);
    const providers = (window.ethereum as any).providers;
    providers.forEach((provider: any, index: number) => {
      const { id: walletId, name: walletName } = detectWalletType(provider);
      console.log(`[WalletDetector] Provider ${index}: ${walletName} (${walletId})`, {
        isMetaMask: provider.isMetaMask,
        isTokenPocket: provider.isTokenPocket,
      });

      if (!seenProviders.has(provider)) {
        seenProviders.add(provider);
        const walletInfo = WALLET_INFO[walletId] || { name: walletName };
        addWallet({
          id: walletId,
          name: walletInfo.name || walletName,
          icon: walletInfo.icon,
          provider,
          isInstalled: true,
          source: 'window.ethereum.providers',
        });
      }
    });
  }

  // Priority 2: Check window.ethereum for MetaMask (avoid TP/OKX masquerading)
  if (
    (window as any).ethereum?.isMetaMask &&
    !(window as any).ethereum?.isTokenPocket &&
    !(window as any).ethereum?.isOKExWallet &&
    !seenProviders.has((window as any).ethereum)
  ) {
    const provider = (window as any).ethereum;
    const { id: walletId, name: walletName } = detectWalletType(provider);
    console.log('[WalletDetector] Found MetaMask via window.ethereum');
    
    seenProviders.add(provider);
    const walletInfo = WALLET_INFO[walletId] || { name: walletName };
    addWallet({
      id: walletId,
      name: walletInfo.name || walletName,
      icon: walletInfo.icon,
      provider,
      isInstalled: true,
      source: 'window.ethereum',
    });
  }

  // Priority 3: Check window.ethereum (single provider, may be overwritten by last installed wallet)
  if (window.ethereum && !seenProviders.has(window.ethereum)) {
    const provider = window.ethereum;
    const { id: walletId, name: walletName } = detectWalletType(provider);
    console.log('[WalletDetector] Found wallet via window.ethereum:', walletName);

    seenProviders.add(provider);
    const walletInfo = WALLET_INFO[walletId] || { name: walletName };
    addWallet({
      id: walletId,
      name: walletInfo.name || walletName,
      icon: walletInfo.icon,
      provider,
      isInstalled: true,
    });
  }

  // Priority 4: TokenPocket injected globals (some builds expose window.tp or window.tokenPocket)
  const tokenPocketGlobals = [
    (window as any).tokenPocket,
    (window as any).tokenpocket,
    (window as any).tp,
  ];
  tokenPocketGlobals.forEach((candidate: any, index: number) => {
    const provider = candidate?.ethereum || candidate;
    if (provider && typeof provider.request === 'function' && !seenProviders.has(provider)) {
      const { id: walletId, name: walletName } = detectWalletType(provider);
      console.log(`[WalletDetector] Found wallet via TokenPocket global ${index}:`, walletName);
      const walletInfo = WALLET_INFO[walletId] || { name: walletName };
      addWallet({
        id: walletId,
        name: walletInfo.name || walletName,
        icon: walletInfo.icon,
        provider,
        isInstalled: true,
        source: 'window.tokenPocket',
      });
      seenProviders.add(provider);
    }
  });

  // Priority 6: Check window.metamask (MetaMask may register here too)
  if ((window as any).metamask && typeof (window as any).metamask === 'object') {
    const provider = (window as any).metamask;
    if (!seenProviders.has(provider) && provider.isMetaMask) {
      console.log('[WalletDetector] Found MetaMask via window.metamask');
      seenProviders.add(provider);
      addWallet({
        id: 'MetaMask',
        name: 'MetaMask',
        icon: WALLET_INFO['MetaMask']?.icon,
        provider,
        isInstalled: true,
        source: 'window.metamask',
      });
    }
  }

  // Sort wallets: MetaMask first, then others alphabetically
  wallets.sort((a, b) => {
    if (a.id === 'MetaMask') return -1;
    if (b.id === 'MetaMask') return 1;
    return a.name.localeCompare(b.name);
  });

  console.log('[WalletDetector] Final detected wallets:', wallets.map(w => ({
    id: w.id,
    name: w.name,
    isMetaMask: w.provider?.isMetaMask,
    isTokenPocket: w.provider?.isTokenPocket,
    isOKX: w.provider?.isOKExWallet
  })));

  return wallets;
}

/**
 * Gets the default wallet provider (MetaMask if available, otherwise first available)
 */
export function getDefaultProvider(): any {
  const wallets = detectWallets();
  if (wallets.length === 0) return null;
  
  // Prefer MetaMask
  const metaMask = wallets.find(w => w.id === 'MetaMask');
  if (metaMask) return metaMask.provider;
  
  // Otherwise return first available
  return wallets[0].provider;
}
