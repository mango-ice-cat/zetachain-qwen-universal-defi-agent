import { create } from 'zustand';
import { AssetOverview, ProtocolInfo, StrategyOption, UserProfile, StrategyStep } from '@shared/types';
import { fetchAssets, fetchProtocols, generateStrategy, executeStrategy, ExecuteStrategyResponse } from '../services/api';
import { io, Socket } from 'socket.io-client';

const EXECUTION_LOG_LIMIT = 200;
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const executionLogKey = (address: string) => `zetaYieldExecutionLog:${address.toLowerCase()}`;

const loadExecutionLog = (address?: string): ExecutionTx[] => {
  if (!isBrowser || !address) return [];
  try {
    const raw = localStorage.getItem(executionLogKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistExecutionLog = (address: string, list: ExecutionTx[]) => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(
      executionLogKey(address),
      JSON.stringify(list.slice(0, EXECUTION_LOG_LIMIT))
    );
  } catch {
    // ignore storage failures
  }
};

const clearExecutionLogStorage = (address?: string) => {
  if (!isBrowser || !address) return;
  try {
    localStorage.removeItem(executionLogKey(address));
  } catch {
    // ignore storage failures
  }
};

interface ExecutionState {
  isExecuting: boolean;
  currentStrategyId: string | null;
  executionResults: ExecuteStrategyResponse | null;
  error: string | null;
}

export interface ExecutionTx {
  id: string;
  runId: string;
  hash: string;
  description: string;
  chainId: number;
  from: string;
  to: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

interface AppState {
  user: UserProfile | null;
  assets: AssetOverview | null;
  protocols: ProtocolInfo[];
  strategies: StrategyOption[];
  socket: Socket | null;
  isLoading: boolean;
  error: string | null;
  execution: ExecutionState;
  executionLog: ExecutionTx[];

  // Actions
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;
  loadData: () => Promise<void>;
  generateStrategies: (input: string) => Promise<{ message: string; strategies: StrategyOption[] }>;
  executeStrategy: (strategyId: string, steps: StrategyStep[]) => Promise<ExecuteStrategyResponse>;
  initializeSocket: () => void;
  addExecutionTx: (tx: ExecutionTx) => void;
  updateExecutionTx: (id: string, patch: Partial<ExecutionTx>) => void;
  clearExecutionLog: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  assets: null,
  protocols: [],
  strategies: [],
  socket: null,
  isLoading: false,
  error: null,
  execution: {
    isExecuting: false,
    currentStrategyId: null,
    executionResults: null,
    error: null,
  },
  executionLog: [],

  connectWallet: async (address) => {
    const currentUser = get().user;
    
    // If same address, don't reconnect
    if (currentUser && currentUser.address.toLowerCase() === address.toLowerCase()) {
      return;
    }

    // Update user state
    const storedExecutionLog = loadExecutionLog(address);
    set({
      user: {
        address,
        preferences: { riskTolerance: 5, favChains: ['ETH', 'ZetaChain'] },
      },
      executionLog: storedExecutionLog,
      error: null,
    });

    // Initialize socket first (non-blocking)
    get().initializeSocket();

    // Load data and wait for completion
    try {
      await get().loadData();
    } catch (error) {
      console.error('Error loading data after wallet connection:', error);
      set({ error: 'Failed to load wallet data' });
    }
  },

  disconnectWallet: () => {
    const { socket } = get();
    const address = get().user?.address;
    
    // Close socket connection
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
    }

    // Clear all state
    set({
      user: null,
      assets: null,
      protocols: [],
      strategies: [],
      socket: null,
      isLoading: false,
      error: null,
      execution: {
        isExecuting: false,
        currentStrategyId: null,
        executionResults: null,
        error: null,
      },
      executionLog: [],
    });

    clearExecutionLogStorage(address);
  },

  loadData: async () => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      const [assets, protocols] = await Promise.all([
        fetchAssets(user.address),
        fetchProtocols()
      ]);
      set({ assets, protocols, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Failed to load data', isLoading: false });
    }
  },

  generateStrategies: async (input) => {
    const { user } = get();
    if (!user) throw new Error('User not connected');

    set({ isLoading: true });
    try {
      const result = await generateStrategy(input, user.address);
      set({ strategies: result.strategies, isLoading: false });
      return result;
    } catch (err) {
      console.error('Strategy generation error:', err);
      set({ error: 'Failed to generate strategy', isLoading: false });
      throw err;
    }
  },

  initializeSocket: () => {
    const { user, socket } = get();
    if (!user) return;

    // Close existing socket if address changed
    if (socket) {
      const currentAddress = socket.io.opts.query?.address;
      if (currentAddress && currentAddress !== user.address) {
        socket.disconnect();
        socket.removeAllListeners();
      } else if (currentAddress === user.address) {
        // Same address, socket already connected
        return;
      }
    }

    // Use relative path for socket.io to leverage proxy
    const newSocket = io({
      path: '/socket.io',
      query: { address: user.address },
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join', user.address);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('strategy_generated', (data: { strategies: StrategyOption[] }) => {
      console.log('Received strategies via socket');
      set({ strategies: data.strategies });
    });

    newSocket.on('strategy_executed', (data: { strategyId: string; results: any[]; status: string }) => {
      console.log('Received strategy execution results via socket');
      set({
        execution: {
          isExecuting: false,
          currentStrategyId: data.strategyId,
          executionResults: {
            strategyId: data.strategyId,
            results: data.results,
            status: data.status as 'success' | 'partial',
            totalSteps: data.results.length,
            successfulSteps: data.results.filter((r: any) => r.status === 'success').length,
          },
          error: null,
        },
      });
    });

    set({ socket: newSocket });
  },

  executeStrategy: async (strategyId: string, steps: StrategyStep[]) => {
    const { user } = get();
    if (!user) throw new Error('User not connected');

    set({
      execution: {
        isExecuting: true,
        currentStrategyId: strategyId,
        executionResults: null,
        error: null,
      },
    });

    try {
      const result = await executeStrategy(strategyId, user.address, steps);
      set({
        execution: {
          isExecuting: false,
          currentStrategyId: strategyId,
          executionResults: result,
          error: null,
        },
      });
      return result;
    } catch (err: any) {
      console.error('Strategy execution error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to execute strategy';
      set({
        execution: {
          isExecuting: false,
          currentStrategyId: strategyId,
          executionResults: null,
          error: errorMessage,
        },
      });
      throw err;
    }
  },

  addExecutionTx: (tx) => {
    set((state) => ({
      executionLog: (() => {
        const updated = [tx, ...state.executionLog].slice(0, EXECUTION_LOG_LIMIT);
        const address = get().user?.address;
        if (address) {
          persistExecutionLog(address, updated);
        }
        return updated;
      })(),
    }));
  },

  updateExecutionTx: (id, patch) => {
    set((state) => ({
      executionLog: (() => {
        const updated = state.executionLog.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
        const address = get().user?.address;
        if (address) {
          persistExecutionLog(address, updated);
        }
        return updated;
      })(),
    }));
  },

  clearExecutionLog: () => {
    set({ executionLog: [] });
    const address = get().user?.address;
    if (address) {
      clearExecutionLogStorage(address);
    }
  },
}));
