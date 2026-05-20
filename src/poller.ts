/**
 * Loop principal: claim jobs del backend → verificar WA → reportar resultado.
 *
 * Diseño pull-based (idéntico a cashi-osiptel-worker):
 *  - Cada ciclo pide hasta BATCH_SIZE números al backend.
 *  - Los procesa secuencialmente (no en paralelo) para no generar burst en WA.
 *  - Si la sesión WA no está lista, espera al siguiente ciclo sin abortar.
 *  - Si el backend no responde, loguea y espera al siguiente ciclo.
 */
import { config } from './config.js';
import { logger } from './logger.js';
import { isReady } from './wa-session.js';
import { checkWhatsApp } from './checker.js';
import { fetchQueue, postResult } from './api-client.js';

let running = false;

export function startPoller(): void {
  if (running) return;
  running = true;
  logger.info({ pollIntervalMs: config.pollIntervalMs, batchSize: config.batchSize }, 'poller started');
  schedulePoll();
}

function schedulePoll(): void {
  setTimeout(async () => {
    await poll();
    if (running) schedulePoll();
  }, config.pollIntervalMs);
}

async function poll(): Promise<void> {
  if (!isReady()) {
    logger.debug('WA session not ready, skipping cycle');
    return;
  }

  let queue;
  try {
    queue = await fetchQueue(config.batchSize);
  } catch (err) {
    logger.warn({ err: errMsg(err) }, 'failed to fetch queue from backend, skipping cycle');
    return;
  }

  if (queue.length === 0) {
    logger.debug('queue empty');
    return;
  }

  logger.info({ count: queue.length }, 'processing batch');

  for (const item of queue) {
    const status = await checkWhatsApp(item.phone);
    try {
      await postResult(item.id, status);
      logger.info({ id: item.id, status }, 'result posted');
    } catch {
      // Error ya logueado en postResult; continuamos con el siguiente
    }
  }
}

export function stopPoller(): void {
  running = false;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
