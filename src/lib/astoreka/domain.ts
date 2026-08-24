import type { Client, EstimateTotals, Job, JobMaterialLine, WorkGroup, WorkStatus } from "./types";

export const VAT_RATE = 0.21;

export const TARIFFS = {
  callOutLocal: 25,
  callOutExtended: 40,
  hourlyStandard: 30,
  hourlyUrgent: 45,
  diagnosis: 35,
  minimumWork: 45,
  extraKm: 0.35,
} as const;

export const WORK_STATUS_GROUPS: Record<WorkStatus, WorkGroup> = {
  nuevo: "entrada",
  pendiente_datos: "entrada",
  asignado: "planificacion",
  programado: "planificacion",
  en_camino: "planificacion",
  en_curso: "ejecucion",
  diagnosticado: "ejecucion",
  pendiente_pieza: "ejecucion",
  presupuestado: "presupuesto",
  pendiente_aprobacion: "presupuesto",
  aprobado: "presupuesto",
  realizado: "cierre",
  facturado: "cierre",
  cobrado: "cierre",
  cerrado: "cierre",
  cancelado: "incidencias",
  garantia: "incidencias",
};

export const GROUP_LABELS: Record<WorkGroup, string> = {
  entrada: "Entrada",
  planificacion: "Planificación",
  ejecucion: "Ejecución",
  presupuesto: "Presupuesto",
  cierre: "Cierre/Cobro",
  incidencias: "Incidencias",
};

export const ALL_STATUSES = Object.keys(WORK_STATUS_GROUPS) as WorkStatus[];

export const NEXT_ACTION_BY_STATUS: Record<WorkStatus, string> = {
  nuevo: "Completar datos y asignar técnico",
  pendiente_datos: "Solicitar datos clave al cliente",
  asignado: "Programar visita",
  programado: "Confirmar ventana con cliente",
  en_camino: "Avisar llegada por WhatsApp",
  en_curso: "Registrar diagnóstico y material",
  diagnosticado: "Preparar presupuesto",
  presupuestado: "Enviar presupuesto",
  pendiente_aprobacion: "Seguimiento de aprobación",
  aprobado: "Ejecutar trabajo y cerrar parte",
  pendiente_pieza: "Gestionar recambio y reprogramar",
  realizado: "Emitir factura",
  facturado: "Gestionar cobro",
  cobrado: "Cerrar trabajo con observaciones",
  cerrado: "Guardar aprendizaje técnico",
  cancelado: "Registrar motivo de cancelación",
  garantia: "Programar revisión en garantía",
};

export const STEP_SUGGESTED_BY_STATUS: Record<WorkStatus, WorkStatus | ""> = {
  nuevo: "asignado",
  pendiente_datos: "nuevo",
  asignado: "programado",
  programado: "en_camino",
  en_camino: "en_curso",
  en_curso: "diagnosticado",
  diagnosticado: "presupuestado",
  presupuestado: "pendiente_aprobacion",
  pendiente_aprobacion: "aprobado",
  aprobado: "realizado",
  pendiente_pieza: "programado",
  realizado: "facturado",
  facturado: "cobrado",
  cobrado: "cerrado",
  cerrado: "",
  cancelado: "",
  garantia: "programado",
};

export function getJobCode(sequence: number) {
  return `AST-${String(sequence).padStart(4, "0")}`;
}

export function getInvoiceNumber(sequence: number) {
  return `FAC-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
}

export function emptyEstimateTotals(): EstimateTotals {
  return {
    labor: 0,
    callOut: 0,
    kmCost: 0,
    materialsSale: 0,
    materialsCost: 0,
    subtotal: 0,
    vat: 0,
    total: 0,
    estimatedCost: 0,
    grossMargin: 0,
  };
}

export function getWorkGroup(status: WorkStatus) {
  return WORK_STATUS_GROUPS[status];
}

export function sumMaterialCost(lines: JobMaterialLine[]) {
  return lines.reduce((total, line) => total + line.qty * line.unitCost, 0);
}

export function sumMaterialSale(lines: JobMaterialLine[]) {
  return lines.reduce((total, line) => total + line.qty * line.salePrice, 0);
}

export function calculateEstimateTotals(input: {
  estimatedHours: number;
  distanceKm: number;
  urgent: boolean;
  plannedMaterials: JobMaterialLine[];
}): EstimateTotals {
  const hourly = input.urgent ? TARIFFS.hourlyUrgent : TARIFFS.hourlyStandard;
  const labor = Math.max(input.estimatedHours * hourly, TARIFFS.minimumWork);
  const callOut = input.distanceKm > 15 ? TARIFFS.callOutExtended : TARIFFS.callOutLocal;
  const kmCost = Math.max(input.distanceKm - 10, 0) * TARIFFS.extraKm;
  const materialsSale = sumMaterialSale(input.plannedMaterials);
  const materialsCost = sumMaterialCost(input.plannedMaterials);
  const subtotal = labor + callOut + kmCost + materialsSale;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const estimatedCost = materialsCost + kmCost;
  const grossMargin = subtotal - estimatedCost;

  return {
    labor,
    callOut,
    kmCost,
    materialsSale,
    materialsCost,
    subtotal,
    vat,
    total,
    estimatedCost,
    grossMargin,
  };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getNextAction(job: Job) {
  if (!job.address) return "Completar dirección del trabajo";
  if (!job.clientId) return "Asignar cliente";
  if (job.status === "pendiente_pieza") return "Solicitar pieza y reprogramar visita";
  if (job.status === "facturado") return "Registrar cobro";
  return NEXT_ACTION_BY_STATUS[job.status];
}

export function getWhatsAppText(
  type: "visita" | "presupuesto" | "factura" | "cobro",
  job: Job,
  client?: Client,
  totals = job.totals,
) {
  const customer = client?.name ?? "cliente";

  if (type === "visita") {
    return `Hola ${customer}, soy de Astoreka MTO.\nTrabajo ${job.code}: ${job.symptoms || "revisión"}.\nEstamos en camino / programando visita para ${job.scheduledAt || "hoy"}.\n¿Te va bien?`;
  }

  if (type === "presupuesto") {
    return `Hola ${customer}, ya tenemos tu presupuesto del trabajo ${job.code}.\nSubtotal: ${formatCurrency(totals.subtotal)}\nIVA (21%): ${formatCurrency(totals.vat)}\nTotal: ${formatCurrency(totals.total)}\n¿Lo aprobamos para programar ejecución?`;
  }

  if (type === "factura") {
    return `Hola ${customer}, ya tienes emitida la factura del trabajo ${job.code}.\nSubtotal: ${formatCurrency(totals.subtotal)}\nIVA (21%): ${formatCurrency(totals.vat)}\nTotal: ${formatCurrency(totals.total)}\nTe adjunto el PDF de la factura.`;
  }

  return `Hola ${customer}, te recordamos el cobro pendiente del trabajo ${job.code}.\nImporte pendiente: ${formatCurrency(totals.total)}\nCuando te venga bien, lo cerramos.`;
}
