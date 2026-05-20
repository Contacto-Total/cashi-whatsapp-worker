/**
 * Entry point: inicia la sesión WA y el poller.
 *
 * Arranque:
 *  1. startSession() → si no hay credenciales, muestra QR en terminal.
 *  2. startPoller() → arranca inmediatamente; espera a isReady() en cada ciclo.
 *
 * Cierre limpio (SIGTERM / SIGINT):
 *  - Detiene el poller.
 *  - Cierra la sesión WA.
 */
import { startSession } from './wa-session.js';
import { startPoller, stopPoller } from './poller.js';
import { logger } from './logger.js';
import { config } from './config.js';

logger.info(
  { backendUrl: config.backendUrl, batchSize: config.batchSize, pollIntervalMs: config.pollIntervalMs },
  'cashi-whatsapp-worker starting'
);

async function main() {
  await startSession();
  startPoller();
}

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  stopPoller();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch(err => {
  logger.error({ err }, 'fatal error during startup');
  process.exit(1);
});
