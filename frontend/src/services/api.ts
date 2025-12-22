import axios from 'axios';
import { AssetOverview, ProtocolInfo, StrategyOption, Intent, ApiResponse, StrategyStep } from '@shared/types';

// Use relative URL to leverage Vite proxy
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout for execution
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const fetchAssets = async (address: string): Promise<AssetOverview> => {
  const response = await api.get<AssetOverview>(`/assets/${address}`);
  return response.data;
};

export const fetchProtocols = async (): Promise<ProtocolInfo[]> => {
  const response = await api.get<ProtocolInfo[]>('/protocols');
  return response.data;
};

export const generateStrategy = async (input: string, address: string) => {
  const response = await api.post<{ intent: Intent; strategies: StrategyOption[]; message: string }>(
    '/chat/strategy',
    { input, address }
  );
  return response.data;
};

export interface ExecutionResult {
  stepId: string;
  txHash: string;
  status: 'success' | 'failed';
  gasUsed: string;
}

export interface ExecuteStrategyResponse {
  strategyId: string;
  results: ExecutionResult[];
  status: 'success' | 'partial';
  totalSteps: number;
  successfulSteps: number;
}

export const executeStrategy = async (
  strategyId: string,
  address: string,
  steps: StrategyStep[]
): Promise<ExecuteStrategyResponse> => {
  const response = await api.post<ExecuteStrategyResponse>(
    '/strategy/execute',
    { strategyId, address, steps }
  );
  return response.data;
};

export interface ExecutionLogPayload {
  id: string;
  runId?: string;
  address: string;
  hash: string;
  chainId: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  from?: string;
  to?: string;
  timestamp?: number;
}

export const fetchExecutionLog = async (address: string) => {
  const response = await api.get(`/transactions/${address}`);
  return response.data;
};

export const addExecutionLog = async (payload: ExecutionLogPayload) => {
  const response = await api.post('/transactions', payload);
  return response.data;
};

export const updateExecutionLog = async (id: string, payload: Partial<ExecutionLogPayload>) => {
  const response = await api.put(`/transactions/${id}`, payload);
  return response.data;
};

export const prepareStrategy = async (
  address: string,
  steps: StrategyStep[]
): Promise<{ transactions: Array<{ chainId: number; to: string; data: string; value?: string; description: string }> }> => {
  const response = await api.post('/strategy/prepare', { address, steps });
  return response.data;
};

export const trackCctx = async (
  hash: string,
  timeoutSeconds = 120
): Promise<{ status: 'pending' | 'completed' | 'failed'; details?: Record<string, any> }> => {
  const response = await api.post('/strategy/track', { hash, timeoutSeconds }, {
    timeout: (timeoutSeconds + 10) * 1000,
  });
  return response.data;
};

export default api;
