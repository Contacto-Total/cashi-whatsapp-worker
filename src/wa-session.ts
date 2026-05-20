/**
 * Gestión del ciclo de vida de la sesión Baileys.
 *
 * Flujo:
 *  - Al iniciar: carga credenciales desde wa-auth.json (si existe).
 *  - Si no hay credenciales: imprime QR en terminal para escaneo manual.
 *  - Una vez conectado: isReady() devuelve true y el poller puede arrancar.
 *  - Si la conexión se cierra por error: reconecta automáticamente.
 *  - Si WhatsApp revoca la sesión (loggedOut): detiene el worker y alerta en logs.
 *
 * IMPORTANTE: wa-auth.json contiene credenciales de sesión — NO commitear.
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import qrcodeTerminal from 'qrcode-terminal';
import { config } from './config.js';
import { logger } from './logger.js';

let sock: WASocket | null = null;
let ready = false;
let stopped = false;

export function isReady(): boolean {
  return ready && !stopped;
}

export function getSock(): WASocket {
  if (!sock) throw new Error('wa-session-not-initialized');
  return sock;
}

export async function startSession(): Promise<void> {
  if (stopped) return;

  // Baileys requiere un directorio para el estado multi-file
  const authDir = config.waAuthFile.replace(/\.json$/, '-keys');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: false,
    logger: logger.child({ module: 'baileys' }) as any,
    // Solo necesitamos presencia (onWhatsApp), no historial de mensajes
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Escanea el siguiente QR con WhatsApp para iniciar sesión:');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'open') {
      ready = true;
      logger.info('WhatsApp session connected');
    }

    if (connection === 'close') {
      ready = false;
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        // Sesión revocada por WhatsApp — requiere re-scan manual
        stopped = true;
        logger.error(
          'WhatsApp session logged out. Delete wa-auth-keys/ and restart to re-scan QR.'
        );
        process.exit(1);
      }

      // Cualquier otro cierre: reconectar
      logger.warn({ reason }, 'WhatsApp connection closed, reconnecting in 5s...');
      await delay(5_000);
      if (!stopped) startSession().catch(() => {});
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
