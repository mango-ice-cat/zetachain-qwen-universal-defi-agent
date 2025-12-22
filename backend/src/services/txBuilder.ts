import { ethers } from 'ethers';
import { StrategyStep } from '../../../shared/types';
import {
  BSC_TESTNET_CHAIN_ID,
  BSC_TESTNET_ADDRESSES,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_ADDRESSES,
  ZETA_TESTNET_ADDRESSES,
  ZETA_TESTNET_CHAIN_ID,
  ZRC20_ADDRESSES,
} from './zetaAddresses';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function withdrawGasFee() view returns (address,uint256)',
];

const GATEWAY_ZEVM_ABI = [
  'function withdraw(bytes receiver,uint256 amount,address zrc20,(address,bool,address,bytes,uint256) revertOptions)',
];

const UNISWAP_V2_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] calldata path,address to,uint256 deadline) returns (uint256[] memory amounts)',
];

const GATEWAY_EVM_ABI = [
  'function deposit(address receiver,(address,bool,address,bytes,uint256) revertOptions) payable',
];

const BATCH_EXECUTOR_ABI = [
  'function swapAndWithdraw(address zrc20In,address zrc20Out,uint256 amountIn,uint256 amountOutMin,bytes receiver,uint256 deadline) returns (uint256,uint256)',
];

const chainIdByName: Record<string, number> = {
  ETH: SEPOLIA_CHAIN_ID,
  BSC: BSC_TESTNET_CHAIN_ID,
  ZetaChain: ZETA_TESTNET_CHAIN_ID,
};

const revertOptions = (address: string): [string, boolean, string, string, number] => ([
  address,
  false,
  ethers.ZeroAddress,
  '0x',
  200000,
]);

const generateNativeDepositData = (amount: string, receiver: string, revertData: ReturnType<typeof revertOptions>) => {
  const gatewayInterface = new ethers.Interface(GATEWAY_EVM_ABI);
  const data = gatewayInterface.encodeFunctionData('deposit', [receiver, revertData]);
  const value = ethers.parseEther(amount);
  return { data, value: value.toString() };
};

const toHexValue = (value?: bigint | string) => {
  if (!value) return undefined;
  const asBigInt = typeof value === 'string' ? BigInt(value) : value;
  return ethers.toBeHex(asBigInt);
};

export interface PreparedTx {
  chainId: number;
  to: string;
  data: string;
  value?: string;
  description: string;
}

const getChainId = (chainName: string): number => {
  const chainId = chainIdByName[chainName];
  if (!chainId) {
    throw new Error(`Unsupported chain for tx preparation: ${chainName}`);
  }
  return chainId;
};

export const buildPreparedTransactions = async (steps: StrategyStep[], address: string): Promise<PreparedTx[]> => {
  const txs: PreparedTx[] = [];
  const skipSteps = new Set<string>();
  const batchExecutorAddress = process.env.ZETACHAIN_BATCH_EXECUTOR;

  for (const step of steps) {
    if (skipSteps.has(step.id)) {
      continue;
    }
    if (step.type === 'bridge' && step.fromChain === 'ETH' && step.toChain === 'ZetaChain') {
      const deposit = generateNativeDepositData(String(step.amount), address, revertOptions(address));

      const depositValue = toHexValue(deposit.value);
      txs.push({
        chainId: getChainId(step.fromChain),
        to: SEPOLIA_ADDRESSES.gateway,
        data: deposit.data,
        ...(depositValue ? { value: depositValue } : {}),
        description: `Bridge ${step.amount} ETH to ZetaChain`,
      });
      continue;
    }

    if (step.type === 'swap' && step.fromChain === 'ZetaChain') {
      if (batchExecutorAddress) {
        const withdrawStep = steps.find(
          candidate =>
            candidate.type === 'withdraw' &&
            candidate.fromChain === 'ZetaChain' &&
            candidate.toChain === 'BSC'
        );
        if (withdrawStep) {
          const amountIn = ethers.parseUnits(String(step.amount), ZRC20_ADDRESSES.ETH_SEPOLIA.decimals);
          const approveData = new ethers.Interface(ERC20_ABI).encodeFunctionData('approve', [
            batchExecutorAddress,
            amountIn,
          ]);
          txs.push({
            chainId: getChainId(step.fromChain),
            to: ZRC20_ADDRESSES.ETH_SEPOLIA.address,
            data: approveData,
            description: `Approve batch executor to spend ZRC20-ETH`,
          });

          const executorInterface = new ethers.Interface(BATCH_EXECUTOR_ABI);
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
          const execData = executorInterface.encodeFunctionData('swapAndWithdraw', [
            ZRC20_ADDRESSES.ETH_SEPOLIA.address,
            ZRC20_ADDRESSES.BNB_BSC.address,
            amountIn,
            0,
            ethers.hexlify(ethers.getBytes(address)),
            deadline,
          ]);

          txs.push({
            chainId: getChainId(step.fromChain),
            to: batchExecutorAddress,
            data: execData,
            description: `Batch swap+withdraw via executor`,
          });

          skipSteps.add(withdrawStep.id);
          continue;
        }
      }

      const amountIn = ethers.parseUnits(String(step.amount), ZRC20_ADDRESSES.ETH_SEPOLIA.decimals);
      const approveData = new ethers.Interface(ERC20_ABI).encodeFunctionData('approve', [
        ZETA_TESTNET_ADDRESSES.uniswapV2Router02,
        amountIn,
      ]);

      txs.push({
        chainId: getChainId(step.fromChain),
        to: ZRC20_ADDRESSES.ETH_SEPOLIA.address,
        data: approveData,
        description: `Approve ZetaSwap to spend ZRC20-ETH`,
      });

      const routerInterface = new ethers.Interface(UNISWAP_V2_ROUTER_ABI);
      const path = [ZRC20_ADDRESSES.ETH_SEPOLIA.address, ZRC20_ADDRESSES.BNB_BSC.address];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      const swapData = routerInterface.encodeFunctionData('swapExactTokensForTokens', [
        amountIn,
        0,
        path,
        address,
        deadline,
      ]);

      txs.push({
        chainId: getChainId(step.fromChain),
        to: ZETA_TESTNET_ADDRESSES.uniswapV2Router02,
        data: swapData,
        description: `Swap ZRC20-ETH to ZRC20-BNB on ZetaSwap`,
      });
      continue;
    }

    if (step.type === 'withdraw' && step.fromChain === 'ZetaChain' && step.toChain === 'BSC') {
      if (batchExecutorAddress) {
        continue;
      }
      const provider = new ethers.JsonRpcProvider(process.env.ZETACHAIN_RPC_URL, ZETA_TESTNET_CHAIN_ID);
      const zrc20 = new ethers.Contract(ZRC20_ADDRESSES.BNB_BSC.address, ERC20_ABI, provider) as unknown as {
        decimals: () => Promise<number>;
        withdrawGasFee: () => Promise<[string, bigint]>;
      };
      const decimals = await zrc20.decimals();
      const amount = ethers.parseUnits(String(step.amount), decimals);
      const [gasZRC20, gasFee] = await zrc20.withdrawGasFee();

      const erc20Interface = new ethers.Interface(ERC20_ABI);
      const approveGasData = erc20Interface.encodeFunctionData('approve', [
        ZETA_TESTNET_ADDRESSES.gateway,
        gasFee,
      ]);
      const approveWithdrawData = erc20Interface.encodeFunctionData('approve', [
        ZETA_TESTNET_ADDRESSES.gateway,
        amount,
      ]);

      if (gasZRC20.toLowerCase() !== ZRC20_ADDRESSES.BNB_BSC.address.toLowerCase()) {
        txs.push({
          chainId: getChainId(step.fromChain),
          to: gasZRC20,
          data: approveGasData,
          description: `Approve gas fee token for withdraw`,
        });
      }

      txs.push({
        chainId: getChainId(step.fromChain),
        to: ZRC20_ADDRESSES.BNB_BSC.address,
        data: approveWithdrawData,
        description: `Approve ZRC20-BNB for withdraw`,
      });

      const gatewayInterface = new ethers.Interface(GATEWAY_ZEVM_ABI);
      const withdrawData = gatewayInterface.encodeFunctionData('withdraw(bytes,uint256,address,(address,bool,address,bytes,uint256))', [
        ethers.hexlify(ethers.getBytes(address)),
        amount,
        ZRC20_ADDRESSES.BNB_BSC.address,
        revertOptions(address),
      ]);

      txs.push({
        chainId: getChainId(step.fromChain),
        to: ZETA_TESTNET_ADDRESSES.gateway,
        data: withdrawData,
        description: `Withdraw ZRC20-BNB to BSC Testnet`,
      });
      continue;
    }
  }

  return txs;
};
