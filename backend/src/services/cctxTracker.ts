import axios from 'axios';

type CctxStatus = 'pending' | 'completed' | 'failed';

const DEFAULT_TESTNET_API = 'https://zetachain-athens.blockpi.network/lcd/v1/public';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getApiBase = () => process.env.ZETA_TESTNET_API_URL || DEFAULT_TESTNET_API;

const fetchCctxsByInboundHash = async (hash: string): Promise<any[]> => {
  const api = getApiBase();
  const url = `${api}/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return Array.isArray(response.data?.CrossChainTxs) ? response.data.CrossChainTxs : [];
  } catch (error: any) {
    if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
      return [];
    }
    throw error;
  }
};

const fetchCctxByHash = async (hash: string): Promise<any | undefined> => {
  const api = getApiBase();
  const url = `${api}/zeta-chain/crosschain/cctx/${hash}`;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data?.CrossChainTx;
  } catch (error: any) {
    if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
      return undefined;
    }
    throw error;
  }
};

const extractStatuses = (cctxs: any[]) =>
  cctxs
    .map((cctx) => cctx?.cctx_status?.status)
    .filter((status) => typeof status === 'string');

export const trackCctxStatus = async (hash: string, timeoutSeconds: number): Promise<{ status: CctxStatus; details?: Record<string, any> }> => {
  const deadline = Date.now() + Math.max(timeoutSeconds, 10) * 1000;
  let lastSeen: any[] = [];

  while (Date.now() < deadline) {
    const cctxs = await fetchCctxsByInboundHash(hash);
    if (cctxs.length === 0) {
      const direct = await fetchCctxByHash(hash);
      if (direct) {
        lastSeen = [direct];
      }
    } else {
      lastSeen = cctxs;
    }

    if (lastSeen.length > 0) {
      const statuses = extractStatuses(lastSeen);
      if (statuses.some((status) => status === 'Aborted' || status === 'Reverted')) {
        return { status: 'failed', details: { cctxs: lastSeen } };
      }
      if (statuses.length > 0 && statuses.every((status) => status === 'OutboundMined')) {
        return { status: 'completed', details: { cctxs: lastSeen } };
      }
    }

    await sleep(3000);
  }

  return {
    status: 'pending',
    ...(lastSeen.length ? { details: { cctxs: lastSeen } } : {}),
  };
};
