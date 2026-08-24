import { demoAppData } from "./demo-data";
import { emptyEstimateTotals } from "./domain";
import type { AppData, Job, JobEvent, WorkStatus } from "./types";

const STORAGE_KEY = "astoreka-mto-data-v1";
const CLOUD_SYNC_META_KEY = "astoreka-mto-cloud-sync-v1";

type CloudSyncMeta = {
  pendingSince: string;
};

export function isCloudConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return demoAppData;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoAppData));
    return demoAppData;
  }

  try {
    return normalizeAppData(JSON.parse(raw));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoAppData));
    return demoAppData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function readCloudSyncMeta() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CLOUD_SYNC_META_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CloudSyncMeta;
    return typeof parsed.pendingSince === "string" ? parsed : null;
  } catch {
    window.localStorage.removeItem(CLOUD_SYNC_META_KEY);
    return null;
  }
}

export function hasPendingCloudSync() {
  return Boolean(readCloudSyncMeta());
}

export function markCloudSyncPending() {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readCloudSyncMeta();
  const next: CloudSyncMeta = {
    pendingSince: existing?.pendingSince ?? new Date().toISOString(),
  };
  window.localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify(next));
}

export function clearPendingCloudSync() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CLOUD_SYNC_META_KEY);
}

export function createStatusEvent(job: Job, fromStatus: WorkStatus | "", note: string): JobEvent {
  return {
    id: `ev-${job.id}-${Date.now()}`,
    jobId: job.id,
    eventType: "estado_actualizado",
    fromStatus,
    toStatus: job.status,
    note,
    createdAt: new Date().toISOString(),
  };
}

export function resetDemoData() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoAppData));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asArrayOr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeJobs(value: unknown): Job[] {
  const fallback = demoAppData.jobs[0];
  if (!fallback) {
    return [];
  }

  return asArray(value).map((entry, index) => {
    const record = asRecord(entry);
    const totals = asRecord(record.totals);
    return {
      ...fallback,
      ...record,
      id: typeof record.id === "string" ? record.id : `jb-recovered-${index + 1}`,
      code: typeof record.code === "string" ? record.code : getRecoveredJobCode(index + 1),
      plannedMaterials: asArray(record.plannedMaterials) as Job["plannedMaterials"],
      actualMaterials: asArray(record.actualMaterials) as Job["actualMaterials"],
      photos: asArray(record.photos) as string[],
      totals:
        Object.keys(totals).length > 0
          ? {
              ...emptyEstimateTotals(),
              ...totals,
            }
          : emptyEstimateTotals(),
    } as Job;
  });
}

function getRecoveredJobCode(index: number) {
  return `AST-REC-${String(index).padStart(3, "0")}`;
}

export function normalizeAppData(value: unknown): AppData {
  const record = asRecord(value);
  return {
    ...demoAppData,
    clients: asArrayOr(record.clients, demoAppData.clients),
    assets: asArrayOr(record.assets, demoAppData.assets),
    materials: asArrayOr(record.materials, demoAppData.materials),
    jobs: Array.isArray(record.jobs) ? normalizeJobs(record.jobs) : demoAppData.jobs,
    invoices: asArrayOr(record.invoices, demoAppData.invoices),
    estimates: asArrayOr(record.estimates, demoAppData.estimates),
    expenses: asArrayOr(record.expenses, demoAppData.expenses),
    suppliers: asArrayOr(record.suppliers, demoAppData.suppliers),
    purchases: asArrayOr(record.purchases, demoAppData.purchases),
    creditNotes: asArrayOr(record.creditNotes, demoAppData.creditNotes),
    events: asArrayOr(record.events, demoAppData.events),
    knowledge: asArrayOr(record.knowledge, demoAppData.knowledge),
    sequence: asNumber(record.sequence, demoAppData.sequence),
  };
}
