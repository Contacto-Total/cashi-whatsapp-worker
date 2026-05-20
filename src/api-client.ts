import axios from 'axios';
import { config } from './config.js';
import { logger } from './logger.js';
import type { QueueItem, WaStatus } from './schema.js';

const http = axios.create({
  baseURL: config.backendUrl,
  headers: { 'X-Worker-Token': config.workerToken },
  timeout: 15_000,
});

export async function fetchQueue(limit: number): Promise<QueueItem[]> {
  const { data } = await http.get<QueueItem[]>('/api/v1/whatsapp/queue', {
    params: { limit },
  });
  return data;
}

export async function postResult(id: number, status: WaStatus, errorDetail?: string): Promise<void> {
  try {
    await http.post('/api/v1/whatsapp/result', { id, status, errorDetail });
  } catch (err) {
    logger.warn({ id, status, err: errMsg(err) }, 'failed to post result to backend');
    throw err;
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
