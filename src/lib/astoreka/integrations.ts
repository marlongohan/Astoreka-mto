import type { AppData, Job } from "./types";

const N8N_QUEUE_KEY = "astoreka-mto-n8n-queue-v1";

type OperationalEventType =
  | "job_created"
  | "estimate_created"
  | "job_status_changed"
  | "invoice_created"
  | "invoice_collected";

interface OperationalEvent {
  type: OperationalEventType;
  job: Job;
  appData: Pick<AppData, "clients" | "assets" | "invoices" | "estimates">;
  createdAt: string;
}

function getWebhookUrl() {
  return import.meta.env.VITE_N8N_EVENT_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL || "";
}

function queueEvent(event: OperationalEvent) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = window.localStorage.getItem(N8N_QUEUE_KEY);
  const queue = existing ? (JSON.parse(existing) as OperationalEvent[]) : [];
  window.localStorage.setItem(N8N_QUEUE_KEY, JSON.stringify([event, ...queue].slice(0, 100)));
}

export function getQueuedN8nEvents() {
  if (typeof window === "undefined") {
    return [];
  }

  const existing = window.localStorage.getItem(N8N_QUEUE_KEY);
  return existing ? (JSON.parse(existing) as OperationalEvent[]) : [];
}

export async function emitOperationalEvent(type: OperationalEventType, job: Job, appData: AppData) {
  const event: OperationalEvent = {
    type,
    job,
    appData: {
      clients: appData.clients,
      assets: appData.assets,
      invoices: appData.invoices,
      estimates: appData.estimates,
    },
    createdAt: new Date().toISOString(),
  };

  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    queueEvent(event);
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    queueEvent(event);
  }
}

export function isN8nConfigured() {
  return Boolean(getWebhookUrl());
}
