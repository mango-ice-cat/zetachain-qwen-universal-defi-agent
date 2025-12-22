import { useState, useEffect, useCallback, useRef } from 'react';
import { detectWallets, getDefaultProvider } from '../utils/walletDetector';
import type { WalletProvider } from '../utils/walletDetector';

// 钱包状态接口定义
export interface WalletState {
  address: string | null;      // 钱包地址
  balance: string | null;      // 钱包余额
  chainId: number | null;      // 当前链ID
  isConnecting: boolean;       // 是否正在连接
  isConnected: boolean;        // 是否已连接
  error: string | null;        // 错误信息
}

const STORAGE_KEY = 'wallet_connection_state'; // 本地存储键名
const PROVIDER_KEY = 'wallet_provider'; // 记录用户选择的钱包

// 从本地存储加载持久化状态
// 注意：仅加载地址和 chainId 用于显示
// isConnected 需要在 silent reconnect 校验后再开启
const loadPersistedState = (): Partial<WalletState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 仅恢复最近（24小时内）的状态
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return {
          address: parsed.address || null,
          chainId: parsed.chainId || null,
          // isConnected 需要在 silent reconnect 校验后再开启
          isConnected: false,
        };
      }
    }
  } catch (error) {
    console.error('Error loading persisted wallet state:', error);
  }
  return {};
};

const loadPersistedProvider = (): { id?: string; rdns?: string; source?: string; timestamp?: number } | null => {
  try {
    const stored = localStorage.getItem(PROVIDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading persisted wallet provider:', error);
  }
  return null;
};

// ZetaChain 测试网配置
export const ZETA_TESTNET = {
  chainId: '0x1B59', // 十六进制 7001
  chainName: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    name: 'ZETA',
    symbol: 'ZETA',
    decimals: 18,
  },
  rpcUrls: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
  blockExplorerUrls: ['https://athens.explorer.zetachain.com'],
};

export const useWallet = () => {
  // 初始化钱包状态，尝试从本地存储加载
  const [walletState, setWalletState] = useState<WalletState>(() => {
    const persisted = loadPersistedState();
    return {
      address: persisted.address || null,
      balance: null, // 永远不恢复余额 - 必须重新获取
      chainId: persisted.chainId || null,
      isConnecting: false,
      isConnected: false, // 需通过 silent reconnect 校验
      error: null,
    };
  });
  const walletStateRef = useRef(walletState);

  // 存储当前选择的 Provider 对象
  const selectedProviderRef = useRef<any>(null);

  // 使用 ref 跟踪是否已注册监听器
  const listenersRegistered = useRef(false);
  const silentReconnectAttempted = useRef(false);
  useEffect(() => {
    walletStateRef.current = walletState;
  }, [walletState]);

  // 改进的余额格式化函数，带精度控制
  const formatBalance = (balanceWei: string): string => {
    try {
      // 使用 BigInt 处理大数精度
      const balanceBigInt = BigInt(balanceWei);
      const divisor = BigInt(1e18);
      const wholePart = balanceBigInt / divisor;
      const remainder = balanceBigInt % divisor;
      
      // 将余数转换为小数部分
      const decimalPart = Number(remainder) / 1e18;
      const total = Number(wholePart) + decimalPart;
      
      // 根据数值大小格式化小数位
      if (total === 0) return '0.0000';
      if (total < 0.0001) return total.toFixed(8);
      if (total < 1) return total.toFixed(6);
      return total.toFixed(4);
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0.0000';
    }
  };

  // 获取余额函数
  const getBalance = useCallback(async (address: string, provider?: any) => {
    // 关键：始终优先使用传入的 provider 或 selectedProviderRef
    // 仅在绝对必要时回退到 window.ethereum（连接过程中不应发生）
    const providerToUse = provider || selectedProviderRef.current;
    if (!providerToUse) {
      console.warn('[getBalance] No provider available, falling back to window.ethereum');
      if (!window.ethereum) return null;
      return getBalance(address, window.ethereum);
    }
    
    console.log('[getBalance] Using provider:', {
      isMetaMask: providerToUse.isMetaMask,
      isTokenPocket: providerToUse.isTokenPocket,
      isOKX: providerToUse.isOKExWallet,
      provided: !!provider,
      fromRef: providerToUse === selectedProviderRef.current
    });
    
    try {
      // 请求 eth_getBalance
      const balance = await providerToUse.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return formatBalance(balance);
    } catch (error) {
      console.error('[getBalance] Error:', error);
      return null;
    }
  }, []);

  // 切换到 ZetaChain 测试网
  const switchToZetaTestnet = useCallback(async (provider?: any): Promise<{ success: boolean; error?: string }> => {
    // 关键：始终优先使用传入的 provider 或 selectedProviderRef
    const providerToUse = provider || selectedProviderRef.current;
    if (!providerToUse) {
      console.error('[switchToZetaTestnet] No provider available');
      return { success: false, error: 'Wallet not connected' };
    }
    
    console.log('[switchToZetaTestnet] Using provider:', {
      isMetaMask: providerToUse.isMetaMask,
      isTokenPocket: providerToUse.isTokenPocket,
      isOKX: providerToUse.isOKExWallet
    });
    
    try {
      // 尝试切换网络
      await providerToUse.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ZETA_TESTNET.chainId }],
      });
      return { success: true };
    } catch (switchError: any) {
      // 错误码 4902 表示链未添加，尝试添加链
      if (switchError.code === 4902) {
        try {
          await providerToUse.request({
            method: 'wallet_addEthereumChain',
            params: [ZETA_TESTNET],
          });
          return { success: true };
        } catch (addError: any) {
          return { 
            success: false, 
            error: addError.message || 'Failed to add ZetaChain network' 
          };
        }
      }
      // 用户拒绝请求
      if (switchError.code === 4001) {
        return { success: false, error: 'User rejected network switch' };
      }
      return { 
        success: false, 
        error: switchError.message || 'Failed to switch network' 
      };
    }
  }, []);

  // 连接钱包核心函数
  const connect = useCallback(async (autoSwitchNetwork = false, wallet?: WalletProvider) => {
    const provider = wallet?.provider;
    const walletId = wallet?.id;
    const walletSource = wallet?.source;
    const walletRdns = wallet?.rdns;
    console.log('[Wallet Connect] ========== START CONNECTION ==========');
    console.log('[Wallet Connect] Parameters:', { 
      hasProvider: !!provider, 
      providerType: walletId || (provider?.isMetaMask ? 'MetaMask' : provider?.isTokenPocket ? 'TokenPocket' : provider?.isOKExWallet ? 'OKX' : 'Unknown'),
      providerIsMetaMask: provider?.isMetaMask,
      providerIsTokenPocket: provider?.isTokenPocket,
      providerIsOKX: provider?.isOKExWallet,
      selectedWalletId: walletId,
      selectedWalletSource: walletSource,
      selectedWalletRdns: walletRdns,
      providerObject: provider
    });
    
    // 连接前强制清除任何残留状态
    // 这确保了即使有过期状态也能重新连接
    if (walletState.address || walletState.isConnected) {
      console.log('[Wallet Connect] Clearing stale state...');
      setWalletState(prev => ({
        ...prev,
        address: null,
        isConnected: false,
        balance: null,
        chainId: null,
      }));
    }

    // 关键：如果提供了 provider，直接使用 - 绝不回退
    // 这确保我们使用用户选择的确切 provider
    if (!provider) {
      console.error('[Wallet Connect] ERROR: No provider provided! User must select a wallet.');
      const error = 'Please select a wallet from the list.';
      setWalletState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    // 使用用户选择的确切 provider 对象 - 不回退
    const providerToUse = provider;
    
    console.log('[Wallet Connect] Using EXACT provider object:', {
      isMetaMask: providerToUse.isMetaMask,
      isTokenPocket: providerToUse.isTokenPocket,
      isOKX: providerToUse.isOKExWallet,
      hasRequest: typeof providerToUse.request === 'function',
      providerObject: providerToUse,
      providerReference: providerToUse === provider ? 'SAME' : 'DIFFERENT'
    });

    // 关键：验证我们使用的是完全相同的对象引用
    if (providerToUse !== provider) {
      console.error('[Wallet Connect] CRITICAL ERROR: Provider object reference mismatch!');
      const error = 'Provider reference error. Please try again.';
      setWalletState(prev => ({ ...prev, isConnecting: false, error }));
      return { success: false, error };
    }

    // 验证 provider 类型是否匹配用户选择
    const expectedIsMetaMask = walletId === 'MetaMask';
    const expectedIsTokenPocket = walletId === 'TokenPocket';
    const expectedIsOKX = walletId === 'OKX';
    const actualIsMetaMask = !!providerToUse.isMetaMask && !providerToUse.isTokenPocket && !providerToUse.isOKExWallet;
    const actualIsTokenPocket = providerToUse.isTokenPocket;
    const actualIsOKX = providerToUse.isOKExWallet;
    const rdnsLooksLikeMetaMask = !!walletRdns && walletRdns.includes('metamask');
    
    console.log('[Wallet Connect] Provider validation:', {
      expected: { isMetaMask: expectedIsMetaMask, isTokenPocket: expectedIsTokenPocket, isOKX: expectedIsOKX, walletId, walletSource, walletRdns },
      actual: { isMetaMask: actualIsMetaMask, isTokenPocket: actualIsTokenPocket, isOKX: actualIsOKX }
    });
    
    // MetaMask 类型检查
    if (expectedIsMetaMask && (!actualIsMetaMask || (walletRdns && !rdnsLooksLikeMetaMask))) {
      console.error('[Wallet Connect] Provider mismatch! Expected MetaMask but got:', {
        isMetaMask: actualIsMetaMask,
        isTokenPocket: actualIsTokenPocket,
        isOKX: actualIsOKX
      });
      const error = 'Provider mismatch: Expected MetaMask but got different wallet. Please try again.';
      setWalletState(prev => ({ ...prev, isConnecting: false, error }));
      return { success: false, error };
    }
    
    // TokenPocket 类型检查
    if (expectedIsTokenPocket && !actualIsTokenPocket) {
      console.error('[Wallet Connect] Provider mismatch! Expected TokenPocket but got:', {
        isMetaMask: actualIsMetaMask,
        isTokenPocket: actualIsTokenPocket,
        isOKX: actualIsOKX
      });
      const error = 'Provider mismatch: Expected TokenPocket but got different wallet. Please try again.';
      setWalletState(prev => ({ ...prev, isConnecting: false, error }));
      return { success: false, error };
    }

    // OKX 类型检查
    if (expectedIsOKX && !actualIsOKX) {
      console.error('[Wallet Connect] Provider mismatch! Expected OKX but got:', {
        isMetaMask: actualIsMetaMask,
        isTokenPocket: actualIsTokenPocket,
        isOKX: actualIsOKX
      });
      const error = 'Provider mismatch: Expected OKX but got different wallet. Please try again.';
      setWalletState(prev => ({ ...prev, isConnecting: false, error }));
      return { success: false, error };
    }
    
    console.log('[Wallet Connect] Provider validation PASSED - using exact provider object');

    // 存储选择的 provider - 关键：存储确切对象
    selectedProviderRef.current = providerToUse;
    console.log('[Wallet Connect] Stored provider in selectedProviderRef:', {
      isMetaMask: selectedProviderRef.current?.isMetaMask,
      isTokenPocket: selectedProviderRef.current?.isTokenPocket,
      isOKX: selectedProviderRef.current?.isOKExWallet
    });

    // 不检查是否已连接 - 始终执行完整的连接流程
    // 这确保用户总是能看到钱包选择和授权提示

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 步骤 1: 检查是否已授权
      try {
        const existingAccounts = await providerToUse.request({
          method: 'eth_accounts',
        });

        // 步骤 2: 如果已授权，强制弹出权限提示
        // 这确保用户可以选择/更改账户
        if (existingAccounts.length > 0) {
          console.log('Wallet already authorized, forcing permission prompt...');
          try {
            // 使用 wallet_requestPermissions 强制弹出模态框
            await providerToUse.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            });
            console.log('Permission request successful');
          } catch (permError: any) {
            // 用户拒绝或方法不支持
            if (permError.code === 4001) {
              throw permError; // 重新抛出用户拒绝错误
            }
            console.warn('Failed to request permissions (may not be supported):', permError);
            // 继续执行 eth_requestAccounts 作为回退方案
          }
        } else {
          console.log('No existing authorization found, wallet should show prompt');
        }
      } catch (checkError: any) {
        // 如果上面的块中用户拒绝了，停止执行
        if (checkError.code === 4001) {
          throw checkError;
        }
        // 否则继续
        console.warn('Failed to check existing accounts:', checkError);
      }

      // 步骤 3: 请求账户 - 这将获取选定的账户
      console.log('[Wallet Connect] Requesting accounts from provider:', {
        providerIsMetaMask: providerToUse.isMetaMask,
        providerIsTokenPocket: providerToUse.isTokenPocket,
        providerIsOKX: providerToUse.isOKExWallet,
        providerObject: providerToUse
      });
      const accounts = await providerToUse.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      const address = accounts[0];
      const chainId = await providerToUse.request({ method: 'eth_chainId' });
      const balance = await getBalance(address, providerToUse);
      const currentChainId = parseInt(chainId, 16);

      // 可选：切换到 Zeta 测试网（非强制）
      let finalChainId = currentChainId;
      let finalBalance = balance;
      
      if (autoSwitchNetwork) {
        const switchResult = await switchToZetaTestnet(providerToUse);
        if (switchResult.success) {
          const newChainId = await providerToUse.request({ method: 'eth_chainId' });
          finalChainId = parseInt(newChainId, 16);
          finalBalance = await getBalance(address, providerToUse);
        } else {
          // 网络切换失败，但连接仍然成功
          console.warn('Network switch failed:', switchResult.error);
        }
      }

      const newState = {
        address,
        balance: finalBalance,
        chainId: finalChainId,
        isConnecting: false,
        isConnected: true,
        error: null,
      };

      setWalletState(newState);

      // 持久化连接状态
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          address,
          chainId: finalChainId,
          timestamp: Date.now(),
        }));
        localStorage.setItem(PROVIDER_KEY, JSON.stringify({
          id: walletId,
          rdns: walletRdns,
          source: walletSource,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Error persisting wallet state:', error);
      }

      return { success: true, address };
    } catch (error: any) {
      let errorMessage = 'Failed to connect wallet';
      
      if (error.code === 4001) {
        errorMessage = 'User rejected the connection request';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Please check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [walletState.isConnected, walletState.address, getBalance, switchToZetaTestnet]);

  // 静默恢复连接（不触发弹窗）
  useEffect(() => {
    let cancelled = false;
    const trySilentReconnect = async () => {
      if (silentReconnectAttempted.current) return;
      const snapshot = walletStateRef.current;
      if (snapshot.isConnected || snapshot.isConnecting) return;
      const persisted = loadPersistedState();
      const persistedProvider = loadPersistedProvider();
      if (!persisted.address || !persistedProvider) return;
      if (!window.ethereum) return;
      silentReconnectAttempted.current = true;

      const wallets = detectWallets();
      const matched = wallets.find((wallet) => {
        if (persistedProvider.id && wallet.id === persistedProvider.id) return true;
        if (persistedProvider.rdns && wallet.rdns && wallet.rdns.includes(persistedProvider.rdns)) return true;
        return false;
      });
      if (!matched?.provider) return;

      try {
        selectedProviderRef.current = matched.provider;
        setWalletState(prev => ({ ...prev, isConnecting: true }));
        const accounts = await Promise.race([
          matched.provider.request({ method: 'eth_accounts' }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('silent reconnect timeout')), 1500)),
        ]);
        if (!accounts || accounts.length === 0) {
          setWalletState(prev => ({ ...prev, isConnecting: false }));
          return;
        }
        const address = accounts[0];
        const chainIdHex = await matched.provider.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);
        const balance = await getBalance(address, matched.provider);

        if (cancelled) return;
        setWalletState({
          address,
          balance,
          chainId,
          isConnecting: false,
          isConnected: true,
          error: null,
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          address,
          chainId,
          timestamp: Date.now(),
        }));
      } catch (error) {
        if (cancelled) return;
        console.warn('Silent reconnect failed:', error);
        setWalletState(prev => ({ ...prev, isConnecting: false }));
      }
    };

    trySilentReconnect();
    return () => {
      cancelled = true;
    };
  }, [getBalance]);

  // 断开连接函数
  const disconnect = useCallback(async () => {
    // 步骤 1: 如果已授权，撤销钱包权限
    // 关键：使用 selectedProviderRef - 绝不回退到 window.ethereum
    const providerToUse = selectedProviderRef.current;
    if (providerToUse) {
      console.log('[Disconnect] Using provider:', {
        isMetaMask: providerToUse.isMetaMask,
        isTokenPocket: providerToUse.isTokenPocket,
        isOKX: providerToUse.isOKExWallet
      });
      try {
        // 检查是否有已授权的账户
        const accounts = await providerToUse.request({
          method: 'eth_accounts',
        });
        
        // 如果已授权，撤销权限
        if (accounts.length > 0) {
          try {
            await providerToUse.request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }],
            });
            console.log('Revoked wallet permissions on disconnect');
          } catch (revokeError: any) {
            // 如果撤销失败，记录日志但不阻止断开连接
            console.warn('Failed to revoke wallet permissions:', revokeError);
          }
        }
      } catch (error) {
        // 如果检查账户失败，记录日志但不阻止断开连接
        console.warn('Failed to check wallet accounts on disconnect:', error);
      }
    }
    
    // 清除选定的 provider
    selectedProviderRef.current = null;

    // 步骤 2: 强制清除所有前端状态（包括地址）
    setWalletState({
      address: null,  // 显式清除地址
      balance: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,  // 显式设置为 false
      error: null,
    });
    
    // 步骤 3: 清除持久化状态
    try {
      localStorage.removeItem(STORAGE_KEY);
      // 同时清除任何其他潜在的钱包相关存储
      localStorage.removeItem('wallet_provider');
    } catch (error) {
      console.error('Error clearing persisted wallet state:', error);
    }
    
    // 步骤 4: 确保 provider 引用被清除
    selectedProviderRef.current = null;
  }, []);

    // 监听账户和链的变化（优化以避免重复注册）
    useEffect(() => {
      // 关键：使用 selectedProviderRef - 绝不回退到 window.ethereum
      const providerToUse = selectedProviderRef.current;
      if (!providerToUse || listenersRegistered.current) {
        if (!providerToUse) {
          console.log('[useEffect] No provider in selectedProviderRef, skipping event listener registration');
        }
        return;
      }
      
      console.log('[useEffect] Registering event listeners for provider:', {
        isMetaMask: providerToUse.isMetaMask,
        isTokenPocket: providerToUse.isTokenPocket,
        isOKX: providerToUse.isOKExWallet
      });

    // 处理账户变更事件
    const handleAccountsChanged = async (accounts: string[]) => {
      // 仅当钱包当前已连接时处理账户变更
      if (!walletState.isConnected) return;
      
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddress = accounts[0];
        // 仅当地址实际发生变化时更新
        if (newAddress.toLowerCase() !== walletState.address?.toLowerCase()) {
          // 关键：使用 selectedProviderRef - 绝不回退到 window.ethereum
          const providerToUse = selectedProviderRef.current;
          if (!providerToUse) {
            console.error('[handleAccountsChanged] No provider available in selectedProviderRef');
            return;
          }
          console.log('[handleAccountsChanged] Using provider:', {
            isMetaMask: providerToUse.isMetaMask,
            isTokenPocket: providerToUse.isTokenPocket,
            isOKX: providerToUse.isOKExWallet
          });
          const balance = await getBalance(newAddress, providerToUse);
          setWalletState(prev => ({
            ...prev,
            address: newAddress,
            balance,
          }));
          
          // 更新持久化状态
          try {
            if (providerToUse) {
              const chainId = await providerToUse.request({ method: 'eth_chainId' });
              localStorage.setItem(STORAGE_KEY, JSON.stringify({
                address: newAddress,
                chainId: parseInt(chainId, 16),
                timestamp: Date.now(),
              }));
            }
          } catch (error) {
            console.error('Error updating persisted state:', error);
          }
        }
      }
    };

    // 处理链变更事件
    const handleChainChanged = async (chainId: string) => {
      // 仅当钱包当前已连接时处理链变更
      if (!walletState.isConnected) return;
      
      const address = walletState.address;
      if (address) {
        // 关键：使用 selectedProviderRef - 绝不回退到 window.ethereum
        const providerToUse = selectedProviderRef.current;
        if (!providerToUse) {
          console.error('[handleChainChanged] No provider available in selectedProviderRef');
          return;
        }
        console.log('[handleChainChanged] Using provider:', {
          isMetaMask: providerToUse.isMetaMask,
          isTokenPocket: providerToUse.isTokenPocket,
          isOKX: providerToUse.isOKExWallet
        });
        const balance = await getBalance(address, providerToUse);
        const newChainId = parseInt(chainId, 16);
        setWalletState(prev => ({
          ...prev,
          chainId: newChainId,
          balance,
        }));
        
        // 更新持久化状态
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            address,
            chainId: newChainId,
            timestamp: Date.now(),
          }));
        } catch (error) {
          console.error('Error updating persisted state:', error);
        }
      }
    };

    // 注册事件监听器
    providerToUse.on('accountsChanged', handleAccountsChanged);
    providerToUse.on('chainChanged', handleChainChanged);
    listenersRegistered.current = true;

    // 清理函数：移除事件监听器
    return () => {
      if (providerToUse) {
        providerToUse.removeListener('accountsChanged', handleAccountsChanged);
        providerToUse.removeListener('chainChanged', handleChainChanged);
      }
      listenersRegistered.current = false;
    };
  }, [walletState.address, getBalance, disconnect]);

  const getProvider = useCallback(() => selectedProviderRef.current, []);

  // 返回 Hook 接口
  return {
    ...walletState,
    connect,
    disconnect,
    switchToZetaTestnet,
    getProvider,
    detectWallets, // 导出钱包检测函数
  };
};

// window.ethereum 的类型声明
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      providers?: any[];
      isMetaMask?: boolean;
      isTokenPocket?: boolean;
      isCoinbaseWallet?: boolean;
      isTrust?: boolean;
      isImToken?: boolean;
      isOKExWallet?: boolean;
      isBitKeep?: boolean;
    };
  }
}
