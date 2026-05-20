export const WA_STATUSES = ['VALIDADO', 'NO_VALIDADO', 'ERROR'] as const;
export type WaStatus = typeof WA_STATUSES[number];

export interface QueueItem {
  id: number;
  phone: string;
}

export interface CheckResult {
  id: number;
  status: WaStatus;
  errorDetail?: string;
}
