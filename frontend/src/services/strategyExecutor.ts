import { prepareStrategy, trackCctx } from './api';
import { StrategyStep } from '@shared/types';
import { ZETA_TESTNET } from '@/hooks/useWallet';
import { useStore } from '@/store/useStore';

const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const BSC_TESTNET_RPC_URL = import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';

const CHAIN_CONFIGS: Record<number, { chainId: string; chainName: string; rpcUrls: string[]; blockExplorerUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number } }> = {
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    rpcUrls: [SEPOLIA_RPC_URL],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  },
  97: {
    chainId: '0x61',
    chainName: 'BSC Testnet',
    rpcUrls: [BSC_TESTNET_RPC_URL],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    nativeCurrency: { name: 'tBNB', symbol: 'BNB', decimals: 18 },
  },
  7001: {
    chainId: ZETA_TESTNET.chainId,
    chainName: ZETA_TESTNET.chainName,
    rpcUrls: ZETA_TESTNET.rpcUrls,
    blockExplorerUrls: ZETA_TESTNET.blockExplorerUrls,
    nativeCurrency: ZETA_TESTNET.nativeCurrency,
  },
};

const ensureChain = async (targetChainId: number, providerOverride?: any) => {
  const provider = providerOverride || window.ethereum;
  if (!provider) throw new Error('Wallet not available');

  const currentChainId = await provider.request({ method: 'eth_chainId' });
  const targetHex = CHAIN_CONFIGS[targetChainId]?.chainId;
  if (!targetHex) throw new Error(`Unsupported chain: ${targetChainId}`);

  if (currentChainId === targetHex) return;

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
  } catch (error: any) {
    if (error.code === 4902) {
      const config = CHAIN_CONFIGS[targetChainId];
      await provider.request({ method: 'wallet_addEthereumChain', params: [config] });
      return;
    }
    throw error;
  }
};

const isValidAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

const resolveActiveAddress = async (fallback: string, providerOverride?: any) => {
  const provider = providerOverride || window.ethereum;
  if (!provider) return fallback;
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (Array.isArray(accounts) && accounts.length > 0 && isValidAddress(accounts[0])) {
      return accounts[0];
    }
  } catch {
    // ignore
  }
  return fallback;
};

const waitForReceipt = async (txHash: string, providerOverride?: any) => {
  const provider = providerOverride || window.ethereum;
  if (!provider) return;
  for (let i = 0; i < 60; i += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });
    if (receipt) return receipt;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

export const executeStrategyOnChain = async (address: string, steps: StrategyStep[], providerOverride?: any) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let normalizedAddress = (await resolveActiveAddress(address, providerOverride)).trim();
  if (!isValidAddress(normalizedAddress)) {
    throw new Error('钱包地址无效，请重新连接钱包后再试。');
  }

  const prepared = await prepareStrategy(normalizedAddress, steps);
  if (!prepared.transactions.length) {
    throw new Error('No transactions to execute');
  }

  const { addExecutionTx, updateExecutionTx, executionLog } = useStore.getState();

  for (const tx of prepared.transactions) {
    const existing = executionLog.find(
      (item) => item.description === tx.description && item.chainId === tx.chainId
    );
    if (existing?.status === 'completed') {
      continue;
    }
    if (existing?.status === 'pending') {
      throw new Error('上一笔交易还在确认中，请稍后再试。');
    }

    await ensureChain(tx.chainId, providerOverride);
    const activeAddress = (await resolveActiveAddress(normalizedAddress, providerOverride)).trim();
    if (!isValidAddress(activeAddress)) {
      throw new Error('未检测到有效的钱包地址，请重新连接钱包后再试。');
    }
    normalizedAddress = activeAddress;
    console.log('[Strategy Execute] Using address for tx:', activeAddress, 'to:', tx.to, 'chainId:', tx.chainId);
    if (!isValidAddress(tx.to)) {
      throw new Error(`交易目标地址无效: ${tx.to}`);
    }
    const txParams: Record<string, string> = {
      from: activeAddress,
      to: tx.to,
      data: tx.data,
    };
    if (tx.value) {
      txParams.value = tx.value;
    }
    const provider = providerOverride || window.ethereum;
    if (!provider) {
      throw new Error('Wallet not available');
    }
    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });
    if (!hash) continue;

    const logId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addExecutionTx({
      id: logId,
      runId,
      hash: hash as string,
      description: tx.description,
      chainId: tx.chainId,
      from: activeAddress,
      to: tx.to,
      status: 'pending',
      timestamp: Date.now(),
    });

    const receipt = await waitForReceipt(hash as string, provider);
    const status = (receipt as any)?.status;
    if (status === 0 || status === '0x0') {
      updateExecutionTx(logId, { status: 'failed' });
      throw new Error('交易失败，请检查余额或最小金额限制后重试。');
    }

    if (tx.description.toLowerCase().includes('bridge')) {
      try {
        const tracking = await trackCctx(hash as string, 180);
        if (tracking.status === 'failed') {
          updateExecutionTx(logId, { status: 'failed' });
          throw new Error('Bridge failed on ZetaChain');
        }
        if (tracking.status !== 'completed') {
          updateExecutionTx(logId, { status: 'pending' });
          return;
        }
        updateExecutionTx(logId, { status: 'completed' });
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('timeout')) {
          updateExecutionTx(logId, { status: 'pending' });
          return;
        }
        updateExecutionTx(logId, { status: 'pending' });
        throw error;
      }
    } else {
      updateExecutionTx(logId, { status: 'completed' });
    }
  }
};
