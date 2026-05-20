import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  backendUrl: z.string().url(),
  workerToken: z.string().min(1),
  batchSize: z.coerce.number().int().positive().default(10),
  pollIntervalMs: z.coerce.number().int().positive().default(30_000),
  checkTimeoutMs: z.coerce.number().int().positive().default(10_000),
  waAuthFile: z.string().default('./wa-auth.json'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export const config = schema.parse({
  backendUrl: process.env.BACKEND_URL,
  workerToken: process.env.WORKER_TOKEN,
  batchSize: process.env.BATCH_SIZE,
  pollIntervalMs: process.env.POLL_INTERVAL_MS,
  checkTimeoutMs: process.env.CHECK_TIMEOUT_MS,
  waAuthFile: process.env.WA_AUTH_FILE,
  logLevel: process.env.LOG_LEVEL,
});
