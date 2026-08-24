export type WorkStatus =
  | "nuevo"
  | "pendiente_datos"
  | "asignado"
  | "programado"
  | "en_camino"
  | "en_curso"
  | "diagnosticado"
  | "presupuestado"
  | "pendiente_aprobacion"
  | "aprobado"
  | "pendiente_pieza"
  | "realizado"
  | "facturado"
  | "cobrado"
  | "cerrado"
  | "cancelado"
  | "garantia";

export type WorkPriority = "baja" | "media" | "alta" | "urgente";

export type WorkGroup =
  "entrada" | "planificacion" | "ejecucion" | "presupuesto" | "cierre" | "incidencias";

export type ClientType =
  "particular" | "bar_negocio" | "caserio" | "comunidad" | "empresa" | "propietario_multi";

export type AssetCategory =
  | "lavadora"
  | "lavavajillas"
  | "secadora"
  | "alumbrado"
  | "mecanismo"
  | "termo"
  | "caldera"
  | "frigorifico"
  | "instalacion_electrica"
  | "otro";

export type AssetStatus = "activo" | "retirado" | "en_garantia" | "pendiente_revision";

export type InvoiceStatus = "borrador" | "emitida" | "cobrada" | "vencida" | "anulada";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "bizum" | "otro";

export type EstimateStatus = "borrador" | "enviado" | "aceptado" | "rechazado" | "caducado";

export type WorkOrigin = "app" | "llamada" | "telegram" | "whatsapp" | "formulario";

export type ExpenseCategory =
  "materiales" | "herramientas" | "vehiculo" | "gestoria" | "software" | "seguros" | "otros";

export type PurchaseDocumentType =
  "pedido_proveedor" | "albaran_proveedor" | "factura_proveedor" | "recibo_proveedor" | "ticket";

export type PurchaseStatus = "borrador" | "pendiente" | "recibido" | "facturado" | "pagado";

export type CreditNoteStatus = "borrador" | "emitida" | "devuelta" | "anulada";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  phone: string;
  email: string;
  address: string;
  zone: string;
  notes: string;
  tags: string[];
  pendingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  clientId: string;
  address: string;
  category: AssetCategory;
  name: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  photo: string;
  installationDate: string;
  warrantyUntil: string;
  status: AssetStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  sku: string;
  provider: string;
  category: string;
  quantity: number;
  minimum: number;
  cost: number;
  salePrice: number;
  location: string;
  warranty: string;
  compatibility: string;
}

export interface JobMaterialLine {
  id: string;
  materialId?: string;
  name: string;
  qty: number;
  unitCost: number;
  salePrice: number;
  kind: "planned" | "actual";
}

export interface EstimateTotals {
  labor: number;
  callOut: number;
  kmCost: number;
  materialsSale: number;
  materialsCost: number;
  subtotal: number;
  vat: number;
  total: number;
  estimatedCost: number;
  grossMargin: number;
}

export interface Job {
  id: string;
  code: string;
  clientId?: string;
  assetId?: string;
  status: WorkStatus;
  priority: WorkPriority;
  technician: string;
  serviceType: string;
  requestedAt: string;
  scheduledAt: string;
  completedAt: string;
  origin: WorkOrigin;
  symptoms: string;
  description: string;
  diagnosis: string;
  solution: string;
  address: string;
  zone: string;
  distanceKm: number;
  urgent: boolean;
  estimatedHours: number;
  realHours: number;
  notesInternal: string;
  notesClient: string;
  lessons: string;
  requiresApproval: boolean;
  waitingPart: boolean;
  photos: string[];
  plannedMaterials: JobMaterialLine[];
  actualMaterials: JobMaterialLine[];
  totals: EstimateTotals;
}

export interface Invoice {
  id: string;
  jobId: string;
  invoiceNumber: string;
  lines?: Array<{ description: string; qty: number; unitPrice: number }>;
  subtotal: number;
  vat: number;
  total: number;
  status: InvoiceStatus;
  method: PaymentMethod;
  paidAt: string;
  issuedAt: string;
  notes: string;
}

export interface Estimate {
  id: string;
  jobId: string;
  clientId: string;
  status: EstimateStatus;
  sentAt: string;
  approvedAt: string;
  lines: Array<{ description: string; qty: number; unitPrice: number }>;
  subtotal: number;
  vat: number;
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  provider: string;
  concept: string;
  category: ExpenseCategory;
  subtotal: number;
  vat: number;
  total: number;
  paid: boolean;
  receiptAttached: boolean;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  category: ExpenseCategory;
  paymentTerms: string;
  notes: string;
}

export interface PurchaseDocument {
  id: string;
  supplierId: string;
  type: PurchaseDocumentType;
  reference: string;
  status: PurchaseStatus;
  date: string;
  dueDate: string;
  subtotal: number;
  vat: number;
  total: number;
  linkedJobId?: string;
  receiptAttached: boolean;
  notes: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  reference: string;
  status: CreditNoteStatus;
  date: string;
  reason: string;
  subtotal: number;
  vat: number;
  total: number;
}

export interface JobEvent {
  id: string;
  jobId: string;
  eventType: string;
  fromStatus: WorkStatus | "";
  toStatus: WorkStatus;
  note: string;
  createdAt: string;
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  brand: string;
  model: string;
  symptom: string;
  probableCause: string;
  solution: string;
  partsUsed: string;
  confidence: "baja" | "media" | "alta";
  sourceJobId?: string;
  notes: string;
}

export interface AppData {
  clients: Client[];
  assets: Asset[];
  materials: Material[];
  jobs: Job[];
  invoices: Invoice[];
  estimates: Estimate[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: PurchaseDocument[];
  creditNotes: CreditNote[];
  events: JobEvent[];
  knowledge: KnowledgeEntry[];
  sequence: number;
}

export type MainSection =
  | "inicio"
  | "trabajos"
  | "trabajo"
  | "agenda"
  | "clientes"
  | "equipos"
  | "presupuestos"
  | "facturas"
  | "administracion";
