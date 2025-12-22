export interface HistoryItem {
  id: string;
  timestamp: number;
  intentSummary: string;
  strategyLabel: string;
  expectedYieldRange?: string;
  receiptStatus?: 'pending' | 'success' | 'failed';
}

const KEY = 'zetaYieldHistory';

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addHistory = (item: HistoryItem) => {
  const list = getHistory();
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
};

