/**
 * Verifica si un número de teléfono tiene WhatsApp activo.
 *
 * Reglas:
 *  - Normaliza a E.164 Perú (+51XXXXXXXXX).
 *  - Números fijos (no empiezan con 9) → NO_VALIDADO directo (fijos no tienen WA).
 *  - Usa sock.onWhatsApp() de Baileys — solo consulta existencia, no envía mensajes.
 *  - Timeout configurable para no bloquear el poller.
 *  - Errores → ERROR (el registro queda SIN_VALIDAR para reintento).
 */
import { config } from './config.js';
import { logger, maskPhone } from './logger.js';
import { getSock } from './wa-session.js';
import type { WaStatus } from './schema.js';

export async function checkWhatsApp(phone: string): Promise<WaStatus> {
  const e164 = normalizePhone(phone);

  if (!e164) {
    logger.warn({ phone: maskPhone(phone) }, 'phone format invalid, skipping');
    return 'ERROR';
  }

  // Números fijos peruanos (7-8 dígitos, no empiezan con 9) nunca tienen WA
  const localDigits = e164.replace('+51', '');
  if (!localDigits.startsWith('9')) {
    logger.debug({ phone: maskPhone(phone) }, 'landline detected, marking NO_VALIDADO');
    return 'NO_VALIDADO';
  }

  try {
    const sock = getSock();

    const result = await Promise.race([
      sock.onWhatsApp(e164),
      timeout(config.checkTimeoutMs),
    ]);

    if (!Array.isArray(result) || result.length === 0) {
      logger.debug({ phone: maskPhone(phone) }, 'no WA account found → NO_VALIDADO');
      return 'NO_VALIDADO';
    }

    const exists = result[0]?.exists === true;
    const status: WaStatus = exists ? 'VALIDADO' : 'NO_VALIDADO';
    logger.debug({ phone: maskPhone(phone), status }, 'WA check done');
    return status;
  } catch (err) {
    logger.warn({ phone: maskPhone(phone), err: errMsg(err) }, 'WA check failed → ERROR');
    return 'ERROR';
  }
}

/**
 * Normaliza a E.164 (+51XXXXXXXXX).
 * Acepta: 987654321, 51987654321, +51987654321, 987-654-321, etc.
 * Devuelve null si no es un número válido.
 */
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');

  // Quitar código de país 51 si empieza con él y tiene 11 dígitos
  if (digits.length === 11 && digits.startsWith('51')) {
    digits = digits.substring(2);
  }

  // Números peruanos válidos: 9 dígitos (móvil) o 7-8 dígitos (fijo Lima/regiones)
  if (digits.length < 7 || digits.length > 9) return null;

  return `+51${digits}`;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`check-timeout-${ms}ms`)), ms)
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
