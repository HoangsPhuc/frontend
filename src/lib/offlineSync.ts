import { TransactionData } from '@/components/TransactionForm';

export interface SyncItem {
  _draftId: string;
  data: TransactionData;
  timestamp: number;
}

const SYNC_KEY = 'dualuoi_sync_queue';

export function getSyncQueue(): SyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addToSyncQueue(data: TransactionData) {
  const queue = getSyncQueue();
  const newItem: SyncItem = {
    _draftId: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    data,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
  
  // Dispatch custom event to update UI
  window.dispatchEvent(new Event('sync_queue_updated'));
  return newItem;
}

export function removeFromSyncQueue(draftId: string) {
  let queue = getSyncQueue();
  queue = queue.filter(item => item._draftId !== draftId);
  localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('sync_queue_updated'));
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const queue = getSyncQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const isEditing = !!item.data.id;
      const url = isEditing ? `/api/transactions/${item.data.id}` : '/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (res.ok) {
        removeFromSyncQueue(item._draftId);
        successCount++;
      } else {
        // If API returns 400 or 401, it's not a network error, maybe data error.
        // We might want to handle it differently, but for now we keep it in queue
        // unless it's a hard error we want to discard.
        if (res.status === 400 || res.status === 401) {
          // If unauthenticated, keep in queue until user logs in.
          failedCount++;
        } else {
          failedCount++;
        }
      }
    } catch (err) {
      // Network error, keep in queue
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}
