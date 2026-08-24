import type { AppData, Job } from "./types";

const N8N_QUEUE_KEY = "astoreka-mto-n8n-queue-v1";

type OperationalEventType =
  | "job_created"
  | "estimate_created"
  | "job_status_changed"
  | "invoice_created"
  | "invoice_collected";

interface OperationalEvent {
  id: string;
  type: OperationalEventType;
  job: Job;
  appData: Pick<AppData, "clients" | "assets" | "invoices" | "estimates">;
  createdAt: string;
}

function getWebhookUrl() {
  return import.meta.env.VITE_N8N_EVENT_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL || "";
}

function getWebhookSecret() {
  return import.meta.env.VITE_N8N_WEBHOOK_SECRET || "";
}

function readQueue() {
  if (typeof window === "undefined") {
    return [] as OperationalEvent[];
  }

  const existing = window.localStorage.getItem(N8N_QUEUE_KEY);
  return existing ? (JSON.parse(existing) as OperationalEvent[]) : [];
}

function writeQueue(queue: OperationalEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(N8N_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
}

function getWebhookHeaders(eventId: string) {
  const secret = getWebhookSecret();

  return {
    "content-type": "application/json",
    "x-astoreka-event-id": eventId,
    ...(secret ? { "x-astoreka-webhook-secret": secret } : {}),
  };
}

function queueEvent(event: OperationalEvent) {
  if (typeof window === "undefined") {
    return;
  }

  writeQueue([event, ...readQueue()]);
}

export function getQueuedN8nEvents() {
  return readQueue();
}

export async function emitOperationalEvent(type: OperationalEventType, job: Job, appData: AppData) {
  const event: OperationalEvent = {
    id: crypto.randomUUID(),
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
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: getWebhookHeaders(event.id),
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Webhook response: ${response.status}`);
    }
  } catch {
    queueEvent(event);
  }
}

export async function flushQueuedN8nEvents() {
  const webhookUrl = getWebhookUrl();
  const queued = readQueue();
  if (!webhookUrl || queued.length === 0) {
    return { delivered: 0, pending: queued.length };
  }

  const pending: OperationalEvent[] = [];
  let delivered = 0;

  for (const event of [...queued].reverse()) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: getWebhookHeaders(event.id),
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Webhook response: ${response.status}`);
      }

      delivered += 1;
    } catch {
      pending.unshift(event);
    }
  }

  writeQueue(pending);
  return { delivered, pending: pending.length };
}

export function isN8nConfigured() {
  return Boolean(getWebhookUrl());
}
