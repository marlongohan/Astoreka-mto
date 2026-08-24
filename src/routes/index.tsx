import { createFileRoute } from "@tanstack/react-router";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Copy,
  FileDown,
  Euro,
  FileText,
  Filter,
  Hammer,
  LayoutDashboard,
  LogIn,
  LogOut,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  TriangleAlert,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ALL_STATUSES,
  GROUP_LABELS,
  STEP_SUGGESTED_BY_STATUS,
  TARIFFS,
  WORK_STATUS_GROUPS,
  calculateEstimateTotals,
  emptyEstimateTotals,
  formatCurrency,
  getJobCode,
  getNextAction,
  getWhatsAppText,
  getWorkGroup,
} from "@/lib/astoreka/domain";
import { demoAppData } from "@/lib/astoreka/demo-data";
import {
  getCloudUser,
  loadCloudAppData,
  saveCloudAppData,
  signInToCloud,
  signOutFromCloud,
  type CloudSyncState,
} from "@/lib/astoreka/cloud-storage";
import {
  emitOperationalEvent,
  flushQueuedN8nEvents,
  isN8nConfigured,
} from "@/lib/astoreka/integrations";
import {
  clearPendingCloudSync,
  createStatusEvent,
  hasPendingCloudSync,
  isCloudConfigured,
  loadAppData,
  markCloudSyncPending,
  saveAppData,
} from "@/lib/astoreka/storage";
import type {
  AppData,
  Asset,
  Client,
  Estimate,
  Invoice,
  Job,
  JobMaterialLine,
  MainSection,
  Material,
  WorkGroup,
  WorkPriority,
  WorkStatus,
} from "@/lib/astoreka/types";

const NAV_ITEMS: Array<{ key: MainSection; label: string; icon: typeof LayoutDashboard }> = [
  { key: "inicio", label: "Inicio", icon: LayoutDashboard },
  { key: "trabajos", label: "Trabajos", icon: Wrench },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "equipos", label: "Equipos", icon: Hammer },
  { key: "presupuestos", label: "Presupuestos", icon: FileText },
  { key: "facturas", label: "Facturas", icon: Euro },
  { key: "administracion", label: "Administración", icon: FileDown },
];

const NAV_ITEM_KEYS = NAV_ITEMS.map((item) => item.key);
const MOBILE_MORE_SECTIONS = NAV_ITEMS.filter(
  (item) => !["inicio", "trabajos", "agenda"].includes(item.key),
);
const KANBAN_DROP_STATUS: Record<WorkGroup, WorkStatus> = {
  entrada: "nuevo",
  planificacion: "programado",
  ejecucion: "en_curso",
  presupuesto: "presupuestado",
  cierre: "realizado",
  incidencias: "pendiente_pieza",
};
const ASTOREKA_LOGO_SRC = "/brand/astoreka-logo-2026.png";
const ASTOREKA_WORDMARK_SRC = "/brand/astoreka-wordmark-2026.png";
const ASTOREKA_TAGLINE = "Etxeko eta etxetresnen konponketa elektrikoak";

const STATUS_CLASS: Record<WorkStatus, string> = {
  pendiente_datos: "border-slate-300 bg-slate-100 text-slate-700",
  nuevo: "border-blue-300 bg-blue-50 text-blue-800",
  asignado: "border-sky-300 bg-sky-50 text-sky-800",
  programado: "border-cyan-300 bg-cyan-50 text-cyan-800",
  en_camino: "border-teal-300 bg-teal-50 text-teal-800",
  en_curso: "border-teal-300 bg-teal-50 text-teal-800",
  diagnosticado: "border-indigo-300 bg-indigo-50 text-indigo-800",
  presupuestado: "border-violet-300 bg-violet-50 text-violet-800",
  pendiente_aprobacion: "border-amber-300 bg-amber-50 text-amber-900",
  aprobado: "border-emerald-300 bg-emerald-50 text-emerald-800",
  pendiente_pieza: "border-orange-300 bg-orange-50 text-orange-900",
  realizado: "border-lime-300 bg-lime-50 text-lime-800",
  facturado: "border-red-300 bg-red-50 text-red-800",
  cobrado: "border-emerald-400 bg-emerald-100 text-emerald-900",
  cerrado: "border-zinc-300 bg-zinc-100 text-zinc-700",
  cancelado: "border-zinc-300 bg-zinc-100 text-zinc-600",
  garantia: "border-purple-300 bg-purple-50 text-purple-800",
};

function formatStatusLabel(status: WorkStatus) {
  return status.replaceAll("_", " ");
}

function AstorekaBrand({
  className = "",
  logoClassName = "h-14 w-auto",
  wordmarkClassName = "h-10 min-w-0 flex-1 w-full",
}: {
  className?: string;
  logoClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={`flex w-full min-w-0 items-center gap-3 ${className}`.trim()}>
      <img
        src={ASTOREKA_LOGO_SRC}
        alt="Astoreka"
        className={`${logoClassName} shrink-0 object-contain`}
      />
      <img
        src={ASTOREKA_WORDMARK_SRC}
        alt="Astoreka · Konponketa elektrikoak eta etxetresna elektrikoak"
        className={`${wordmarkClassName} object-contain object-left`}
      />
    </div>
  );
}

function AstorekaBrandDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full items-center gap-3 text-[#f97316] ${className}`.trim()}>
      <div className="h-0.5 flex-1 rounded-full bg-current/80" />
      <Zap className="size-5 shrink-0 fill-current stroke-current" />
      <div className="h-0.5 flex-1 rounded-full bg-current/80" />
    </div>
  );
}

function AstorekaBrandHero({
  className = "",
  logoClassName = "h-20 w-auto sm:h-24",
  wordmarkClassName = "w-full max-w-none object-contain",
  taglineClassName = "max-w-[28rem] text-base font-semibold leading-tight text-foreground sm:text-2xl",
  contentClassName = "items-center text-center",
}: {
  className?: string;
  logoClassName?: string;
  wordmarkClassName?: string;
  taglineClassName?: string;
  contentClassName?: string;
}) {
  return (
    <div className={`flex w-full min-w-0 items-center gap-4 ${className}`.trim()}>
      <img
        src={ASTOREKA_LOGO_SRC}
        alt="Astoreka"
        className={`${logoClassName} shrink-0 object-contain`}
      />
      <div className={`flex min-w-0 flex-1 flex-col justify-center gap-2 ${contentClassName}`.trim()}>
        <img
          src={ASTOREKA_WORDMARK_SRC}
          alt="Astoreka · Konponketa elektrikoak eta etxetresna elektrikoak"
          className={wordmarkClassName}
        />
        <AstorekaBrandDivider className="max-w-[42rem]" />
        <p className={taglineClassName}>{ASTOREKA_TAGLINE}</p>
      </div>
    </div>
  );
}

type AgendaView = "dia" | "semana" | "mes" | "horas";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTH_WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const AGENDA_HOURS = Array.from({ length: 13 }, (_, index) => 8 + index);

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAgendaJobDateKey(job: Job) {
  return job.scheduledAt || job.requestedAt || toDateKey(new Date());
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(startOfLocalDay(date), mondayOffset);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return startOfLocalDay(new Date());
  }
  return new Date(year, month - 1, day);
}

function formatAgendaRange(date: Date, view: AgendaView) {
  if (view === "mes") {
    return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
  }

  if (view === "dia" || view === "horas") {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  const start = getWeekStart(date);
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getQuarterKey(dateValue: string) {
  const date = dateValue ? parseDateKey(dateValue) : new Date();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-T${quarter}`;
}

function getQuarterLabel(key: string) {
  const [year, quarter] = key.split("-T");
  return `T${quarter || ""} ${year || ""}`.trim();
}

function roundMoney(amount: number) {
  return Number(amount.toFixed(2));
}

function formatCompactLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getMonthDays(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astoreka MTO | Gestor SAT operativo" },
      {
        name: "description",
        content:
          "Gestor SAT para mantenimiento técnico operativo: móvil primero, historial por equipo, presupuestos, partes y cobros.",
      },
      { property: "og:title", content: "Astoreka MTO | Gestor SAT operativo" },
      { property: "og:image", content: ASTOREKA_LOGO_SRC },
      {
        property: "og:description",
        content:
          "Astoreka centraliza avisos, diagnóstico, materiales, horas y cobros en una app rápida para técnicos y oficina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [section, setSection] = useState<MainSection>("inicio");
  const [data, setData] = useState<AppData>(demoAppData);
  const [query, setQuery] = useState("");
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<WorkGroup | null>(null);
  const [dragOverAgendaDate, setDragOverAgendaDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "todos">("todos");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJobTab, setSelectedJobTab] = useState("resumen");
  const diagnosisFieldRef = useRef<HTMLTextAreaElement>(null);
  const dataRef = useRef<AppData>(demoAppData);
  const lastLocalChangeAt = useRef(0);
  const lastCloudUpdateAt = useRef("");
  const pendingCloudSyncRef = useRef(hasPendingCloudSync());
  const cloudPullBusyRef = useRef(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudState, setCloudState] = useState<CloudSyncState>({
    status: isCloudConfigured() ? "signed-out" : "local",
    message: isCloudConfigured() ? "Conecta una sesión para sincronizar." : "Modo local activo.",
  });
  const [cloudForm, setCloudForm] = useState({ email: "", password: "" });
  const [materialLineDraft, setMaterialLineDraft] = useState({
    materialId: "",
    qty: "1",
  });
  const [newDialog, setNewDialog] = useState<
    "aviso" | "trabajo" | "cliente" | "equipo" | "presupuesto" | "cita" | "material" | ""
  >("");
  const [agendaView, setAgendaView] = useState<AgendaView>("semana");
  const [agendaDate, setAgendaDate] = useState(() => toDateKey(new Date()));

  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    address: "",
    zone: "",
    type: "particular",
  });
  const [newAsset, setNewAsset] = useState({
    clientId: "",
    category: "otro",
    name: "",
    brand: "",
    model: "",
    serial: "",
    location: "",
    address: "",
  });
  const [newJob, setNewJob] = useState({
    clientId: "",
    assetId: "",
    symptoms: "",
    description: "",
    address: "",
    zone: "",
    technician: "",
    serviceType: "Mantenimiento doméstico pequeño",
    priority: "media",
    estimatedHours: "1.5",
    distanceKm: "8",
    urgent: false,
  });
  const [scheduleDraft, setScheduleDraft] = useState({
    jobId: "",
    scheduledAt: toDateKey(new Date()),
  });
  const [quickActionMessage, setQuickActionMessage] = useState("");
  const [newJobError, setNewJobError] = useState("");
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    sku: "",
    provider: "",
    category: "consumible",
    quantity: "1",
    minimum: "1",
    cost: "0",
    salePrice: "0",
    location: "Furgón",
    warranty: "",
    compatibility: "otro",
  });

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let active = true;
    const initial = loadAppData();
    setData(initial);
    dataRef.current = initial;
    if (initial.jobs.length > 0) {
      setSelectedJobId(initial.jobs[0]?.id ?? "");
    }

    if (!isCloudConfigured()) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const user = await getCloudUser();
        if (!active) {
          return;
        }

        if (!user) {
          setCloudState({
            status: "signed-out",
            message: "Supabase listo. Inicia sesión para guardar en la nube.",
          });
          return;
        }

        setCloudState({
          status: "syncing",
          userId: user.id,
          email: user.email ?? "usuario",
          message: pendingCloudSyncRef.current
            ? "Subiendo cambios locales pendientes."
            : "Cargando datos de Supabase.",
        });

        if (pendingCloudSyncRef.current) {
          const saved = await saveCloudAppData(initial);
          lastCloudUpdateAt.current = saved?.updated_at ?? "";
          pendingCloudSyncRef.current = false;
          clearPendingCloudSync();
          if (!active) {
            return;
          }

          setCloudState({
            status: "ready",
            userId: user.id,
            email: user.email ?? "usuario",
            message: "Cambios locales pendientes enviados a Supabase.",
          });
          return;
        }

        const snapshot = await loadCloudAppData();
        if (!active) {
          return;
        }

        if (snapshot) {
          lastCloudUpdateAt.current = snapshot.updated_at;
          saveAppData(snapshot.data);
          dataRef.current = snapshot.data;
          setData(snapshot.data);
          setSelectedJobId(snapshot.data.jobs[0]?.id ?? "");
        } else {
          const saved = await saveCloudAppData(initial);
          lastCloudUpdateAt.current = saved?.updated_at ?? "";
        }

        setCloudState({
          status: "ready",
          userId: user.id,
          email: user.email ?? "usuario",
          message: snapshot ? "Datos cargados desde Supabase." : "Primer snapshot creado.",
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setCloudState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo sincronizar con Supabase.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const jobs = data.jobs;
  const clientsById = useMemo(
    () => new Map(data.clients.map((client) => [client.id, client])),
    [data.clients],
  );
  const assetsById = useMemo(
    () => new Map(data.assets.map((asset) => [asset.id, asset])),
    [data.assets],
  );
  const invoicesByJob = useMemo(
    () => new Map(data.invoices.map((invoice) => [invoice.jobId, invoice])),
    [data.invoices],
  );

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchStatus = statusFilter === "todos" ? true : job.status === statusFilter;
      const clientName = job.clientId ? (clientsById.get(job.clientId)?.name ?? "") : "";
      const matchQuery =
        q.length === 0 ||
        job.code.toLowerCase().includes(q) ||
        job.symptoms.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        job.technician.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [jobs, statusFilter, query, clientsById]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId),
    [jobs, selectedJobId],
  );
  const scheduleJob = useMemo(
    () => jobs.find((job) => job.id === scheduleDraft.jobId),
    [jobs, scheduleDraft.jobId],
  );
  const focusDiagnosisField = () => {
    setSelectedJobTab("resumen");

    const focusField = () => {
      diagnosisFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      diagnosisFieldRef.current?.focus({ preventScroll: true });
    };

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(focusField);
    window.setTimeout(focusField, 120);
  };

  const kpis = useMemo(() => {
    const openStatuses: WorkStatus[] = [
      "nuevo",
      "pendiente_datos",
      "asignado",
      "programado",
      "en_camino",
      "en_curso",
      "diagnosticado",
      "presupuestado",
      "pendiente_aprobacion",
      "aprobado",
      "pendiente_pieza",
      "realizado",
      "facturado",
    ];

    const openJobs = jobs.filter((job) => openStatuses.includes(job.status)).length;
    const visitsToday = jobs.filter(
      (job) => job.scheduledAt === new Date().toISOString().slice(0, 10),
    ).length;
    const pendingCollection = jobs
      .filter((job) => job.status === "facturado")
      .reduce((sum, job) => sum + job.totals.total, 0);
    const pendingApproval = jobs.filter((job) =>
      ["presupuestado", "pendiente_aprobacion"].includes(job.status),
    ).length;
    const monthMargin = jobs.reduce((sum, job) => sum + job.totals.grossMargin, 0);

    return {
      openJobs,
      visitsToday,
      pendingCollection,
      pendingApproval,
      monthMargin,
    };
  }, [jobs]);

  const fiscalSummary = useMemo(() => {
    const currentQuarterKey = getQuarterKey(new Date().toISOString().slice(0, 10));
    const issuedInvoices = data.invoices.filter(
      (invoice) =>
        invoice.status !== "anulada" && getQuarterKey(invoice.issuedAt) === currentQuarterKey,
    );
    const quarterExpenses = data.expenses.filter(
      (expense) => getQuarterKey(expense.date) === currentQuarterKey,
    );
    const salesSubtotal = issuedInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);
    const outputVat = issuedInvoices.reduce((sum, invoice) => sum + invoice.vat, 0);
    const invoicedTotal = issuedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const collectedTotal = issuedInvoices
      .filter((invoice) => invoice.status === "cobrada")
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const expensesSubtotal = quarterExpenses.reduce((sum, expense) => sum + expense.subtotal, 0);
    const inputVat = quarterExpenses.reduce((sum, expense) => sum + expense.vat, 0);
    const expensesTotal = quarterExpenses.reduce((sum, expense) => sum + expense.total, 0);
    const missingReceipts = quarterExpenses.filter((expense) => !expense.receiptAttached).length;

    return {
      quarterKey: currentQuarterKey,
      quarterLabel: getQuarterLabel(currentQuarterKey),
      issuedInvoices,
      quarterExpenses,
      salesSubtotal,
      outputVat,
      invoicedTotal,
      collectedTotal,
      expensesSubtotal,
      inputVat,
      expensesTotal,
      vatDue: outputVat - inputVat,
      estimatedResult: salesSubtotal - expensesSubtotal,
      missingReceipts,
    };
  }, [data.expenses, data.invoices]);

  const erpSummary = useMemo(() => {
    const stockCostValue = data.materials.reduce(
      (sum, material) => sum + material.quantity * material.cost,
      0,
    );
    const stockSaleValue = data.materials.reduce(
      (sum, material) => sum + material.quantity * material.salePrice,
      0,
    );
    const lowStockCount = data.materials.filter(
      (material) => material.quantity <= material.minimum,
    ).length;
    const purchaseTotal = data.purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const unpaidPurchases = data.purchases.filter((purchase) => purchase.status !== "pagado");
    const pendingPurchaseTotal = unpaidPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const missingPurchaseReceipts = data.purchases.filter(
      (purchase) => !purchase.receiptAttached,
    ).length;
    const creditNoteTotal = data.creditNotes
      .filter((creditNote) => creditNote.status !== "anulada")
      .reduce((sum, creditNote) => sum + creditNote.total, 0);
    const pendingInvoiceTotal = data.invoices
      .filter((invoice) => invoice.status !== "cobrada" && invoice.status !== "anulada")
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return {
      stockCostValue,
      stockSaleValue,
      lowStockCount,
      purchaseTotal,
      unpaidPurchases,
      pendingPurchaseTotal,
      missingPurchaseReceipts,
      creditNoteTotal,
      pendingInvoiceTotal,
      treasuryBalance: fiscalSummary.collectedTotal - pendingPurchaseTotal,
    };
  }, [
    data.creditNotes,
    data.invoices,
    data.materials,
    data.purchases,
    fiscalSummary.collectedTotal,
  ]);

  const jobsByGroup = useMemo(() => {
    return {
      entrada: jobs.filter((job) => getWorkGroup(job.status) === "entrada"),
      planificacion: jobs.filter((job) => getWorkGroup(job.status) === "planificacion"),
      ejecucion: jobs.filter((job) => getWorkGroup(job.status) === "ejecucion"),
      presupuesto: jobs.filter((job) => getWorkGroup(job.status) === "presupuesto"),
      cierre: jobs.filter((job) => getWorkGroup(job.status) === "cierre"),
      incidencias: jobs.filter((job) => getWorkGroup(job.status) === "incidencias"),
    };
  }, [jobs]);

  const agendaBaseDate = useMemo(() => parseDateKey(agendaDate), [agendaDate]);
  const agendaWeekDays = useMemo(() => {
    const start = getWeekStart(agendaBaseDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [agendaBaseDate]);
  const agendaMonthDays = useMemo(() => getMonthDays(agendaBaseDate), [agendaBaseDate]);
  const agendaJobs = useMemo(
    () =>
      [...jobs].sort((first, second) => {
        const dateOrder = getAgendaJobDateKey(first).localeCompare(getAgendaJobDateKey(second));
        if (dateOrder !== 0) {
          return dateOrder;
        }
        return first.code.localeCompare(second.code);
      }),
    [jobs],
  );
  const agendaJobsByDate = useMemo(() => {
    const grouped = new Map<string, typeof agendaJobs>();
    agendaJobs.forEach((job) => {
      const key = getAgendaJobDateKey(job);
      grouped.set(key, [...(grouped.get(key) ?? []), job]);
    });
    return grouped;
  }, [agendaJobs]);
  const agendaTodayKey = toDateKey(new Date());
  const agendaSelectedKey = toDateKey(agendaBaseDate);
  const agendaSelectedJobs = agendaJobsByDate.get(agendaSelectedKey) ?? [];
  const visibleAgendaJobs = useMemo(() => {
    if (agendaView === "dia" || agendaView === "horas") {
      return agendaJobs.filter((job) => getAgendaJobDateKey(job) === agendaSelectedKey);
    }

    const visibleKeys =
      agendaView === "semana"
        ? new Set(agendaWeekDays.map(toDateKey))
        : new Set(agendaMonthDays.map(toDateKey));
    return agendaJobs.filter((job) => visibleKeys.has(getAgendaJobDateKey(job)));
  }, [agendaJobs, agendaMonthDays, agendaSelectedKey, agendaView, agendaWeekDays]);
  const todayJobs = useMemo(
    () => agendaJobs.filter((job) => getAgendaJobDateKey(job) === agendaTodayKey),
    [agendaJobs, agendaTodayKey],
  );

  const shiftAgendaDate = (direction: -1 | 1) => {
    const nextDate =
      agendaView === "mes"
        ? addMonths(agendaBaseDate, direction)
        : agendaView === "semana"
          ? addDays(agendaBaseDate, direction * 7)
          : addDays(agendaBaseDate, direction);
    setAgendaDate(toDateKey(nextDate));
  };

  const openAgendaDay = (dateKey: string, view: AgendaView = "dia") => {
    setAgendaDate(dateKey);
    setAgendaView(view);
  };

  const openJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedJobTab("resumen");
    setSection("trabajo");
  };

  const openJobFromAgenda = (jobId: string) => {
    openJob(jobId);
  };

  const openScheduleDialog = (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    setScheduleDraft({
      jobId,
      scheduledAt: job?.scheduledAt || toDateKey(new Date()),
    });
    setNewDialog("cita");
  };

  const getAgendaClientName = (job: (typeof jobs)[number]) =>
    job.clientId ? (clientsById.get(job.clientId)?.name ?? "Sin cliente") : "Sin cliente";

  const needsAttention = useMemo(() => {
    return jobs.filter(
      (job) =>
        !job.address ||
        !job.clientId ||
        job.status === "pendiente_pieza" ||
        job.status === "pendiente_aprobacion" ||
        job.status === "facturado",
    );
  }, [jobs]);

  const updateData = (updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      lastLocalChangeAt.current = Date.now();
      saveAppData(next);
      if (isCloudConfigured()) {
        pendingCloudSyncRef.current = true;
        markCloudSyncPending();
        void saveCloudAppData(next)
          .then((snapshot) => {
            if (snapshot) {
              lastCloudUpdateAt.current = snapshot.updated_at;
              pendingCloudSyncRef.current = false;
              clearPendingCloudSync();
              setCloudState({
                status: "ready",
                userId: snapshot.owner_id,
                email:
                  cloudState.status === "ready" || cloudState.status === "syncing"
                    ? cloudState.email
                    : "usuario",
                message: `Sincronizado ${new Date(snapshot.updated_at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`,
              });
            }
          })
          .catch((error) => {
            setCloudState({
              status: "error",
              message:
                error instanceof Error
                  ? `Cambios guardados localmente y pendientes de nube: ${error.message}`
                  : "Cambios guardados localmente y pendientes de nube.",
            });
          });
      }
      return next;
    });
  };

  const syncFromCloud = async () => {
    if (!isCloudConfigured()) {
      return;
    }

    setCloudBusy(true);
    try {
      const user = await getCloudUser();
      if (!user) {
        setCloudState({
          status: "signed-out",
          message: "Inicia sesión para activar Supabase.",
        });
        return;
      }

      setCloudState({
        status: "syncing",
        userId: user.id,
        email: user.email ?? "usuario",
        message: pendingCloudSyncRef.current
          ? "Subiendo cambios locales pendientes."
          : "Sincronizando.",
      });

      if (pendingCloudSyncRef.current) {
        const saved = await saveCloudAppData(dataRef.current);
        lastCloudUpdateAt.current = saved?.updated_at ?? "";
        pendingCloudSyncRef.current = false;
        clearPendingCloudSync();
        setCloudState({
          status: "ready",
          userId: user.id,
          email: user.email ?? "usuario",
          message: "Cambios locales pendientes enviados a Supabase.",
        });
        return;
      }

      const snapshot = await loadCloudAppData();
      if (snapshot) {
        lastCloudUpdateAt.current = snapshot.updated_at;
        saveAppData(snapshot.data);
        dataRef.current = snapshot.data;
        setData(snapshot.data);
        setSelectedJobId(snapshot.data.jobs[0]?.id ?? "");
      } else {
        const saved = await saveCloudAppData(data);
        lastCloudUpdateAt.current = saved?.updated_at ?? "";
      }
      setCloudState({
        status: "ready",
        userId: user.id,
        email: user.email ?? "usuario",
        message: snapshot ? "Datos cargados desde Supabase." : "Snapshot creado en Supabase.",
      });
    } catch (error) {
      setCloudState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo sincronizar.",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const pullCloudUpdatesQuietly = async (email: string) => {
    if (!isCloudConfigured() || cloudPullBusyRef.current) {
      return;
    }

    if (Date.now() - lastLocalChangeAt.current < 2500) {
      return;
    }

    cloudPullBusyRef.current = true;
    try {
      if (pendingCloudSyncRef.current) {
        const saved = await saveCloudAppData(dataRef.current);
        if (saved) {
          lastCloudUpdateAt.current = saved.updated_at;
          pendingCloudSyncRef.current = false;
          clearPendingCloudSync();
          setCloudState({
            status: "ready",
            userId: saved.owner_id,
            email,
            message: `Cambios locales enviados ${new Date(saved.updated_at).toLocaleTimeString(
              "es-ES",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}.`,
          });
        }
        return;
      }

      const snapshot = await loadCloudAppData();
      if (!snapshot || snapshot.updated_at === lastCloudUpdateAt.current) {
        return;
      }

      lastCloudUpdateAt.current = snapshot.updated_at;
      saveAppData(snapshot.data);
      dataRef.current = snapshot.data;
      setData(snapshot.data);
      setSelectedJobId((current) =>
        snapshot.data.jobs.some((job) => job.id === current)
          ? current
          : (snapshot.data.jobs[0]?.id ?? ""),
      );
      setCloudState({
        status: "ready",
        userId: snapshot.owner_id,
        email,
        message: `Actualizado ${new Date(snapshot.updated_at).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}.`,
      });
    } catch {
      // El autosync no debe molestar al usuario si una comprobación puntual falla.
    } finally {
      cloudPullBusyRef.current = false;
    }
  };

  const cloudReadyEmail = cloudState.status === "ready" ? cloudState.email : "";

  useEffect(() => {
    if (cloudState.status !== "ready") {
      return;
    }

    const email = cloudReadyEmail;
    const pull = () => void pullCloudUpdatesQuietly(email);
    const intervalId = window.setInterval(pull, 30000);
    const handleVisibility = () => {
      if (!document.hidden) {
        pull();
      }
    };

    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", pull);
      window.removeEventListener("online", pull);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [cloudReadyEmail, cloudState.status]);

  const handleCloudSignIn = async () => {
    if (!cloudForm.email.trim() || cloudForm.password.length < 6) {
      setCloudState({
        status: "error",
        message: "Usa email y contraseña de al menos 6 caracteres.",
      });
      return;
    }

    setCloudBusy(true);
    setCloudState({
      status: "syncing",
      userId: "",
      email: cloudForm.email.trim(),
      message: "Conectando con Supabase.",
    });
    try {
      await signInToCloud(cloudForm.email, cloudForm.password);
      await syncFromCloud();
    } catch (error) {
      setCloudState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudSignOut = async () => {
    setCloudBusy(true);
    try {
      await signOutFromCloud();
      setCloudState({
        status: "signed-out",
        message: "Sesión cerrada. La app sigue guardando localmente.",
      });
    } catch (error) {
      setCloudState({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo cerrar sesión.",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const createClient = () => {
    if (!newClient.name.trim()) {
      return;
    }

    const client: Client = {
      id: `cl-${Date.now()}`,
      name: newClient.name.trim(),
      type: newClient.type as Client["type"],
      phone: newClient.phone.trim(),
      email: "",
      address: newClient.address.trim(),
      zone: newClient.zone.trim(),
      notes: "",
      tags: [],
      pendingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateData((prev) => ({ ...prev, clients: [client, ...prev.clients] }));
    setNewClient({ name: "", phone: "", address: "", zone: "", type: "particular" });
    setNewDialog("");
  };

  const createAsset = () => {
    if (!newAsset.name.trim()) {
      return;
    }

    const asset: Asset = {
      id: `as-${Date.now()}`,
      clientId: newAsset.clientId,
      category: newAsset.category as Asset["category"],
      name: newAsset.name.trim(),
      brand: newAsset.brand.trim(),
      model: newAsset.model.trim(),
      serial: newAsset.serial.trim(),
      location: newAsset.location.trim(),
      address: newAsset.address.trim(),
      notes: "",
      photo: "",
      installationDate: "",
      warrantyUntil: "",
      status: "activo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateData((prev) => ({ ...prev, assets: [asset, ...prev.assets] }));
    setNewAsset({
      clientId: "",
      category: "otro",
      name: "",
      brand: "",
      model: "",
      serial: "",
      location: "",
      address: "",
    });
    setNewDialog("");
  };

  const createJob = (mode: "aviso" | "presupuesto") => {
    const requiredFields = [
      { valid: Boolean(newJob.clientId), label: "cliente" },
      { valid: Boolean(newJob.symptoms.trim()), label: "síntoma/trabajo" },
      { valid: Boolean(newJob.address.trim()), label: "dirección" },
      { valid: Boolean(newJob.technician.trim()), label: "técnico" },
      { valid: Boolean(newJob.serviceType.trim()), label: "tipo de servicio" },
      { valid: Boolean(newJob.description.trim()), label: "descripción inicial" },
    ];
    const missingFields = requiredFields
      .filter((field) => !field.valid)
      .map((field) => field.label);
    const estimatedHours = Number.parseFloat(newJob.estimatedHours);
    const invalidHours =
      mode === "presupuesto" && (!Number.isFinite(estimatedHours) || estimatedHours <= 0);

    if (missingFields.length > 0 || invalidHours) {
      setNewJobError(
        [
          missingFields.length > 0 ? `Faltan: ${missingFields.join(", ")}.` : "",
          invalidHours ? "Horas estimadas debe ser mayor que 0 para presupuestar." : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      return;
    }
    setNewJobError("");

    updateData((prev) => {
      const seq = prev.sequence;
      const code = getJobCode(seq);
      const estimatedHours = Number.parseFloat(newJob.estimatedHours) || 0;
      const distanceKm = Number.parseFloat(newJob.distanceKm) || 0;
      const totals =
        mode === "presupuesto"
          ? calculateEstimateTotals({
              estimatedHours,
              distanceKm,
              urgent: newJob.urgent,
              plannedMaterials: [],
            })
          : emptyEstimateTotals();
      const status: WorkStatus = mode === "presupuesto" ? "presupuestado" : "nuevo";

      const job = {
        id: `jb-${Date.now()}`,
        code,
        clientId: newJob.clientId || undefined,
        assetId: newJob.assetId || undefined,
        status,
        priority: newJob.priority as WorkPriority,
        technician: newJob.technician.trim() || "Sin asignar",
        serviceType: newJob.serviceType,
        requestedAt: new Date().toISOString().slice(0, 10),
        scheduledAt: new Date().toISOString().slice(0, 10),
        completedAt: "",
        origin: "app" as const,
        symptoms: newJob.symptoms.trim(),
        description: newJob.description.trim(),
        diagnosis: "",
        solution: "",
        address: newJob.address.trim(),
        zone: newJob.zone.trim(),
        distanceKm,
        urgent: newJob.urgent,
        estimatedHours,
        realHours: 0,
        notesInternal: "",
        notesClient: "",
        lessons: "",
        requiresApproval: mode === "presupuesto",
        waitingPart: false,
        photos: [],
        plannedMaterials: [],
        actualMaterials: [],
        totals,
      };

      const event = createStatusEvent(
        job,
        "",
        mode === "presupuesto" ? "Presupuesto creado" : "Aviso creado",
      );
      const estimate: Estimate | null =
        mode === "presupuesto" && job.clientId
          ? {
              id: `est-${Date.now()}`,
              jobId: job.id,
              clientId: job.clientId,
              status: "borrador",
              sentAt: "",
              approvedAt: "",
              lines: getEstimateLinesForJob(job),
              subtotal: totals.subtotal,
              vat: totals.vat,
              total: totals.total,
            }
          : null;

      const next = {
        ...prev,
        jobs: [job, ...prev.jobs],
        estimates: estimate ? [estimate, ...prev.estimates] : prev.estimates,
        events: [event, ...prev.events],
        sequence: seq + 1,
      };
      void emitOperationalEvent(
        mode === "presupuesto" ? "estimate_created" : "job_created",
        job,
        next,
      );
      return next;
    });

    setNewJob({
      clientId: "",
      assetId: "",
      symptoms: "",
      description: "",
      address: "",
      zone: "",
      technician: "",
      serviceType: "Mantenimiento doméstico pequeño",
      priority: "media",
      estimatedHours: "1.5",
      distanceKm: "8",
      urgent: false,
    });
    setNewJobError("");
    setNewDialog("");
  };

  const createMaterial = () => {
    if (!newMaterial.name.trim()) {
      return;
    }

    const material: Material = {
      id: `m-${Date.now()}`,
      name: newMaterial.name.trim(),
      sku: newMaterial.sku.trim() || `MAT-${Date.now().toString().slice(-5)}`,
      provider: newMaterial.provider.trim(),
      category: newMaterial.category.trim(),
      quantity: Number.parseFloat(newMaterial.quantity) || 0,
      minimum: Number.parseFloat(newMaterial.minimum) || 0,
      cost: Number.parseFloat(newMaterial.cost) || 0,
      salePrice: Number.parseFloat(newMaterial.salePrice) || 0,
      location: newMaterial.location.trim(),
      warranty: newMaterial.warranty.trim(),
      compatibility: newMaterial.compatibility.trim(),
    };

    updateData((prev) => ({ ...prev, materials: [material, ...prev.materials] }));
    setNewMaterial({
      name: "",
      sku: "",
      provider: "",
      category: "consumible",
      quantity: "1",
      minimum: "1",
      cost: "0",
      salePrice: "0",
      location: "Furgón",
      warranty: "",
      compatibility: "otro",
    });
    setNewDialog("");
  };

  const buildInvoiceForJob = (job: (typeof data.jobs)[number], _invoiceCount: number): Invoice => ({
    id: `inv-${job.id}-${Date.now()}`,
    jobId: job.id,
    invoiceNumber: `FAC-${new Date().getFullYear()}-${job.code}`,
    lines: getEstimateLinesForJob(job),
    subtotal: job.totals.subtotal,
    vat: job.totals.vat,
    total: job.totals.total,
    status: job.status === "cobrado" ? "cobrada" : "emitida",
    method: "transferencia",
    paidAt: job.status === "cobrado" ? new Date().toISOString().slice(0, 10) : "",
    issuedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const getLaborQty = (job: (typeof data.jobs)[number]) =>
    Number((job.estimatedHours > 0 ? job.estimatedHours : 1).toFixed(2));

  const getLaborDescription = (job: (typeof data.jobs)[number]) =>
    job.serviceType?.trim() ? `Mano de obra - ${job.serviceType.trim()}` : "Mano de obra";

  const getEstimateLinesForJob = (job: (typeof data.jobs)[number]) =>
    [
      {
        description: getLaborDescription(job),
        qty: getLaborQty(job),
        unitPrice: job.urgent ? TARIFFS.hourlyUrgent : TARIFFS.hourlyStandard,
      },
      { description: "Salida", qty: 1, unitPrice: job.totals.callOut },
      ...job.plannedMaterials.map((line) => ({
        description: line.name,
        qty: line.qty,
        unitPrice: line.salePrice,
      })),
    ].filter((line) => line.qty > 0 && line.unitPrice > 0);

  const updateJobStatus = (jobId: string, status: WorkStatus) => {
    updateData((prev) => {
      const jobsUpdated = prev.jobs.map((job) => {
        if (job.id !== jobId) {
          return job;
        }
        return {
          ...job,
          status,
          completedAt:
            ["realizado", "facturado", "cobrado", "cerrado"].includes(status) && !job.completedAt
              ? new Date().toISOString().slice(0, 10)
              : job.completedAt,
        };
      });

      const updatedJob = jobsUpdated.find((job) => job.id === jobId);
      const previousJob = prev.jobs.find((job) => job.id === jobId);

      if (!updatedJob || !previousJob) {
        return prev;
      }

      const event = createStatusEvent(
        updatedJob,
        previousJob.status,
        `Estado cambiado a ${status}`,
      );
      let invoices = prev.invoices;
      if (["facturado", "cobrado"].includes(status) && updatedJob.totals.total > 0) {
        const existingInvoice = prev.invoices.find((invoice) => invoice.jobId === jobId);
        invoices = existingInvoice
          ? prev.invoices.map((invoice) =>
              invoice.jobId === jobId
                ? {
                    ...invoice,
                    status: status === "cobrado" ? "cobrada" : invoice.status,
                    paidAt:
                      status === "cobrado" && !invoice.paidAt
                        ? new Date().toISOString().slice(0, 10)
                        : invoice.paidAt,
                  }
                : invoice,
            )
          : [buildInvoiceForJob(updatedJob, prev.invoices.length), ...prev.invoices];
      }

      const next = { ...prev, jobs: jobsUpdated, invoices, events: [event, ...prev.events] };
      void emitOperationalEvent(
        status === "cobrado"
          ? "invoice_collected"
          : status === "facturado"
            ? "invoice_created"
            : "job_status_changed",
        updatedJob,
        next,
      );
      return next;
    });
  };

  const moveJobToKanbanGroup = (jobId: string, group: WorkGroup) => {
    const job = jobs.find((item) => item.id === jobId);
    const nextStatus = KANBAN_DROP_STATUS[group];
    setDraggingJobId(null);
    setDragOverGroup(null);
    setDragOverAgendaDate(null);

    if (!job || job.status === nextStatus) {
      return;
    }

    updateJobStatus(jobId, nextStatus);
  };

  const startJobDrag = (event: DragEvent<HTMLElement>, jobId: string) => {
    setDraggingJobId(jobId);
    setDragOverGroup(null);
    setDragOverAgendaDate(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", jobId);
  };

  const finishJobDrag = () => {
    setDraggingJobId(null);
    setDragOverGroup(null);
    setDragOverAgendaDate(null);
  };

  const moveJobToAgendaDate = (jobId: string, dateKey: string) => {
    setAgendaDate(dateKey);
    finishJobDrag();

    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!source || source.scheduledAt === dateKey) {
        return prev;
      }

      const terminalStatuses: WorkStatus[] = [
        "realizado",
        "facturado",
        "cobrado",
        "cerrado",
        "cancelado",
      ];
      const updatedJob = {
        ...source,
        scheduledAt: dateKey,
        status: terminalStatuses.includes(source.status) ? source.status : ("programado" as const),
      };
      const event = createStatusEvent(
        updatedJob,
        source.status,
        `Visita movida en agenda a ${dateKey}`,
      );
      const next = {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        events: [event, ...prev.events],
      };
      void emitOperationalEvent("job_status_changed", updatedJob, next);
      return next;
    });
  };

  const dropJobOnAgendaDate = (event: DragEvent<HTMLElement>, dateKey: string) => {
    event.preventDefault();
    const jobId = event.dataTransfer.getData("text/plain") || draggingJobId;
    if (jobId) {
      moveJobToAgendaDate(jobId, dateKey);
    }
  };

  const scheduleVisit = () => {
    if (!scheduleDraft.jobId || !scheduleDraft.scheduledAt) {
      return;
    }

    const terminalStatuses: WorkStatus[] = [
      "realizado",
      "facturado",
      "cobrado",
      "cerrado",
      "cancelado",
    ];

    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === scheduleDraft.jobId);
      if (!source) {
        return prev;
      }

      const updatedJob = {
        ...source,
        scheduledAt: scheduleDraft.scheduledAt,
        status: terminalStatuses.includes(source.status) ? source.status : ("programado" as const),
      };
      const event = createStatusEvent(
        updatedJob,
        source.status,
        `Visita programada para ${scheduleDraft.scheduledAt}`,
      );
      const next = {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === source.id ? updatedJob : job)),
        events: [event, ...prev.events],
      };
      void emitOperationalEvent("job_status_changed", updatedJob, next);
      return next;
    });

    setAgendaDate(scheduleDraft.scheduledAt);
    setAgendaView("dia");
    setNewDialog("");
    setSection("agenda");
  };

  const convertJobToEstimate = (jobId: string) => {
    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!source) {
        return prev;
      }

      const totals = calculateEstimateTotals({
        estimatedHours: source.estimatedHours || 1,
        distanceKm: source.distanceKm || 0,
        urgent: source.urgent,
        plannedMaterials: source.plannedMaterials,
      });
      const updatedJob = {
        ...source,
        status: "presupuestado" as const,
        requiresApproval: true,
        totals,
      };
      const estimate: Estimate | null = updatedJob.clientId
        ? {
            id: `est-${Date.now()}`,
            jobId: updatedJob.id,
            clientId: updatedJob.clientId,
            status: "borrador",
            sentAt: "",
            approvedAt: "",
            lines: getEstimateLinesForJob(updatedJob),
            subtotal: totals.subtotal,
            vat: totals.vat,
            total: totals.total,
          }
        : null;
      const event = createStatusEvent(updatedJob, source.status, "Aviso convertido a presupuesto");
      const next = {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        estimates: estimate ? [estimate, ...prev.estimates] : prev.estimates,
        events: [event, ...prev.events],
      };
      void emitOperationalEvent("estimate_created", updatedJob, next);
      return next;
    });
  };

  const syncEstimateForJob = (estimates: Estimate[], job: (typeof data.jobs)[number]) => {
    const nextLines = getEstimateLinesForJob(job);

    const existingEstimate = estimates.find((estimate) => estimate.jobId === job.id);
    if (!existingEstimate && !job.clientId) {
      return estimates;
    }

    if (!existingEstimate) {
      return [
        {
          id: `est-${Date.now()}`,
          jobId: job.id,
          clientId: job.clientId ?? "",
          status: "borrador" as const,
          sentAt: "",
          approvedAt: "",
          lines: nextLines,
          subtotal: job.totals.subtotal,
          vat: job.totals.vat,
          total: job.totals.total,
        },
        ...estimates,
      ];
    }

    return estimates.map((estimate) =>
      estimate.jobId === job.id
        ? {
            ...estimate,
            lines: nextLines,
            subtotal: job.totals.subtotal,
            vat: job.totals.vat,
            total: job.totals.total,
          }
        : estimate,
    );
  };

  const shouldRecalculateTotals = (job: (typeof data.jobs)[number]) =>
    job.requiresApproval || job.totals.total > 0 || job.plannedMaterials.length > 0;

  const updateJobDetails = (
    jobId: string,
    changes: Partial<
      Pick<
        (typeof data.jobs)[number],
        | "assetId"
        | "clientId"
        | "symptoms"
        | "description"
        | "address"
        | "zone"
        | "technician"
        | "serviceType"
        | "priority"
        | "scheduledAt"
        | "distanceKm"
        | "estimatedHours"
        | "urgent"
        | "diagnosis"
        | "solution"
        | "notesClient"
        | "notesInternal"
      >
    >,
  ) => {
    updateData((prev) => {
      let updatedJob = prev.jobs.find((job) => job.id === jobId);
      if (!updatedJob) {
        return prev;
      }

      updatedJob = {
        ...updatedJob,
        ...changes,
        status:
          updatedJob.status === "pendiente_datos" &&
          (changes.clientId || updatedJob.clientId) &&
          (changes.address || updatedJob.address) &&
          (changes.symptoms || updatedJob.symptoms)
            ? "nuevo"
            : updatedJob.status,
      };

      if (shouldRecalculateTotals(updatedJob)) {
        updatedJob = {
          ...updatedJob,
          totals: calculateEstimateTotals({
            estimatedHours: updatedJob.estimatedHours || 1,
            distanceKm: updatedJob.distanceKm || 0,
            urgent: updatedJob.urgent,
            plannedMaterials: updatedJob.plannedMaterials,
          }),
        };
      }

      return {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        estimates: shouldRecalculateTotals(updatedJob)
          ? syncEstimateForJob(prev.estimates, updatedJob)
          : prev.estimates,
        invoices: prev.invoices,
      };
    });
  };

  const saveDiagnosis = (jobId: string) => {
    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!source || !source.diagnosis.trim()) {
        return prev;
      }

      const updatedJob = {
        ...source,
        status:
          source.status === "nuevo" || source.status === "en_curso"
            ? ("diagnosticado" as const)
            : source.status,
      };
      const event = createStatusEvent(updatedJob, source.status, "Diagnóstico guardado");
      const next = {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        events: [event, ...prev.events],
      };
      void emitOperationalEvent("job_status_changed", updatedJob, next);
      return next;
    });
  };

  const addPlannedMaterialToJob = (jobId: string) => {
    const qty = Number.parseFloat(materialLineDraft.qty) || 0;
    if (!materialLineDraft.materialId || qty <= 0) {
      return;
    }

    updateData((prev) => {
      const material = prev.materials.find((entry) => entry.id === materialLineDraft.materialId);
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!material || !source) {
        return prev;
      }

      const line: JobMaterialLine = {
        id: `jl-${Date.now()}`,
        materialId: material.id,
        name: material.name,
        qty,
        unitCost: material.cost,
        salePrice: material.salePrice,
        kind: "planned",
      };
      const plannedMaterials = [...source.plannedMaterials, line];
      const totals = calculateEstimateTotals({
        estimatedHours: source.estimatedHours || 1,
        distanceKm: source.distanceKm || 0,
        urgent: source.urgent,
        plannedMaterials,
      });
      const updatedJob = {
        ...source,
        status:
          source.status === "nuevo" || source.status === "diagnosticado"
            ? ("presupuestado" as const)
            : source.status,
        requiresApproval: true,
        plannedMaterials,
        totals,
      };
      const event = createStatusEvent(
        updatedJob,
        source.status,
        `Material añadido al presupuesto: ${material.name} x ${qty}`,
      );
      return {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        estimates: syncEstimateForJob(prev.estimates, updatedJob),
        events: [event, ...prev.events],
      };
    });
    setMaterialLineDraft({ materialId: "", qty: "1" });
  };

  const removePlannedMaterialFromJob = (jobId: string, lineId: string) => {
    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!source) {
        return prev;
      }

      const plannedMaterials = source.plannedMaterials.filter((line) => line.id !== lineId);
      const totals = calculateEstimateTotals({
        estimatedHours: source.estimatedHours || 1,
        distanceKm: source.distanceKm || 0,
        urgent: source.urgent,
        plannedMaterials,
      });
      const updatedJob = {
        ...source,
        plannedMaterials,
        totals,
      };
      return {
        ...prev,
        jobs: prev.jobs.map((job) => (job.id === jobId ? updatedJob : job)),
        estimates: syncEstimateForJob(prev.estimates, updatedJob),
      };
    });
  };

  const duplicateJob = (jobId: string) => {
    updateData((prev) => {
      const source = prev.jobs.find((job) => job.id === jobId);
      if (!source) {
        return prev;
      }

      const code = getJobCode(prev.sequence);
      const duplicated = {
        ...source,
        id: `jb-${Date.now()}`,
        code,
        status: "nuevo" as const,
        requestedAt: new Date().toISOString().slice(0, 10),
        scheduledAt: new Date().toISOString().slice(0, 10),
        completedAt: "",
      };

      const event = createStatusEvent(duplicated, "", "Trabajo duplicado");
      return {
        ...prev,
        jobs: [duplicated, ...prev.jobs],
        events: [event, ...prev.events],
        sequence: prev.sequence + 1,
      };
    });
  };

  const markUrgent = (jobId: string) => {
    updateData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === jobId ? { ...job, priority: "urgente", urgent: true } : job,
      ),
    }));
  };

  const markCollected = (jobId: string) => {
    updateJobStatus(jobId, "cobrado");
    updateData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((invoice) =>
        invoice.jobId === jobId
          ? {
              ...invoice,
              status: "cobrada",
              paidAt: new Date().toISOString().slice(0, 10),
            }
          : invoice,
      ),
    }));
  };

  const copyWhatsApp = async (
    jobId: string,
    type: "visita" | "presupuesto" | "factura" | "cobro",
    openChat = false,
  ) => {
    const job = data.jobs.find((entry) => entry.id === jobId);
    if (!job) {
      return;
    }
    const client = job.clientId ? clientsById.get(job.clientId) : undefined;
    const invoice = invoicesByJob.get(job.id);
    const totals =
      (type === "factura" || type === "cobro") && invoice
        ? {
            ...job.totals,
            subtotal: invoice.subtotal,
            vat: invoice.vat,
            total: invoice.total,
          }
        : job.totals;
    const text = getWhatsAppText(type, job, client, totals);
    let chatOpened = false;

    if (openChat && typeof window !== "undefined") {
      const href = getWhatsAppHref(jobId, type);
      if (href) {
        window.open(href, "_blank");
        chatOpened = true;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => undefined);
    }

    setQuickActionMessage(
      chatOpened
        ? `WhatsApp preparado para ${client?.name ?? job.code}.`
        : `Texto de WhatsApp copiado para ${client?.name ?? job.code}.`,
    );
    return chatOpened;
  };

  const getWhatsAppHref = (jobId: string, type: "visita" | "presupuesto" | "factura" | "cobro") => {
    const job = data.jobs.find((entry) => entry.id === jobId);
    if (!job) {
      return undefined;
    }
    const client = job.clientId ? clientsById.get(job.clientId) : undefined;
    const invoice = invoicesByJob.get(job.id);
    const phone = client?.phone.replace(/\D/g, "");
    const normalizedPhone = phone?.length === 9 ? `34${phone}` : phone;
    const totals =
      (type === "factura" || type === "cobro") && invoice
        ? {
            ...job.totals,
            subtotal: invoice.subtotal,
            vat: invoice.vat,
            total: invoice.total,
          }
        : job.totals;
    const text = getWhatsAppText(type, job, client, totals);
    return normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const prepareDocumentForWhatsApp = async (kind: "presupuesto" | "factura", jobId: string) => {
    await copyWhatsApp(jobId, kind);
    setQuickActionMessage(
      `${kind === "factura" ? "Factura" : "Presupuesto"} preparado en WhatsApp. Usa el botón PDF para abrir o guardar el documento.`,
    );
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const openPrintableDocument = (kind: "presupuesto" | "factura", jobId: string) => {
    const job = data.jobs.find((entry) => entry.id === jobId);
    if (!job || job.totals.total <= 0) {
      return;
    }

    const client = job.clientId ? clientsById.get(job.clientId) : undefined;
    const asset = job.assetId ? assetsById.get(job.assetId) : undefined;
    const invoice = invoicesByJob.get(job.id);
    const title =
      kind === "factura"
        ? `Factura ${invoice?.invoiceNumber ?? job.code}`
        : `Presupuesto ${job.code}`;
    const printableLines =
      kind === "factura" && invoice?.lines?.length
        ? invoice.lines
        : [
            {
              description: getLaborDescription(job),
              qty: getLaborQty(job),
              unitPrice: getLaborQty(job) > 0 ? job.totals.labor / getLaborQty(job) : 0,
            },
            { description: "Salida", qty: 1, unitPrice: job.totals.callOut },
            { description: "Kilometraje", qty: 1, unitPrice: job.totals.kmCost },
            ...job.plannedMaterials.map((line) => ({
              description: line.name,
              qty: line.qty,
              unitPrice: line.salePrice,
            })),
          ];
    const lines = printableLines
      .map((line) => [
        line.description,
        String(line.qty),
        formatCurrency(line.qty * line.unitPrice),
      ])
      .filter(([, , amount]) => amount !== formatCurrency(0));
    const printableTotals =
      kind === "factura" && invoice
        ? {
            subtotal: invoice.subtotal,
            vat: invoice.vat,
            total: invoice.total,
          }
        : {
            subtotal: job.totals.subtotal,
            vat: job.totals.vat,
            total: job.totals.total,
          };

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #18252b; margin: 40px; line-height: 1.45; }
    .document-actions { display: flex; gap: 10px; margin-bottom: 24px; }
    button { border: 1px solid #0f766e; border-radius: 6px; background: #0f766e; color: #fff; cursor: pointer; font: inherit; padding: 9px 13px; }
    button.secondary { background: #fff; color: #0f766e; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; border-bottom: 2px solid #0f766e; padding-bottom: 18px; margin-bottom: 28px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 26px 0 10px; font-size: 16px; }
    .brand { display: flex; align-items: center; gap: 18px; min-width: 0; flex: 1 1 auto; }
    .brand-logo { width: 92px; height: auto; display: block; flex: 0 0 auto; }
    .brand-copy { display: flex; min-width: 0; flex: 1 1 auto; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
    .brand-wordmark { width: 100%; max-width: none; height: auto; display: block; flex: 1 1 auto; object-fit: contain; object-position: center; }
    .brand-divider { display: flex; width: 100%; align-items: center; gap: 12px; color: #f97316; }
    .brand-divider-line { height: 2px; flex: 1 1 auto; border-radius: 999px; background: currentColor; opacity: 0.8; }
    .brand-divider-icon { font-size: 18px; line-height: 1; }
    .brand-tagline { margin: 0; color: #18252b; font-size: 15px; font-weight: 600; line-height: 1.3; }
    .document-meta { text-align: right; }
    .muted { color: #5f6f75; }
    .box { border: 1px solid #d7e2e4; border-radius: 8px; padding: 14px; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #d7e2e4; padding: 10px; text-align: left; }
    th:last-child, td:last-child { text-align: right; }
    .totals { margin-left: auto; width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { font-size: 20px; font-weight: 700; color: #0f766e; }
    @media print { .document-actions { display: none; } body { margin: 24px; } }
  </style>
</head>
<body>
  <div class="document-actions">
    <button class="secondary" onclick="window.opener?.focus(); window.close(); history.back()">Volver a la app</button>
    <button onclick="window.print()">Imprimir / guardar PDF</button>
  </div>
  <header>
    <div class="brand">
      <img class="brand-logo" src="${ASTOREKA_LOGO_SRC}" alt="Astoreka" />
      <div class="brand-copy">
        <img
          class="brand-wordmark"
          src="${ASTOREKA_WORDMARK_SRC}"
          alt="Astoreka · Konponketa elektrikoak eta etxetresna elektrikoak"
        />
        <div class="brand-divider">
          <div class="brand-divider-line"></div>
          <div class="brand-divider-icon">⚡</div>
          <div class="brand-divider-line"></div>
        </div>
        <p class="brand-tagline">${escapeHtml(ASTOREKA_TAGLINE)}</p>
      </div>
    </div>
    <div class="document-meta">
      <strong>${escapeHtml(title)}</strong><br />
      <span class="muted">${new Date().toLocaleDateString("es-ES")}</span>
    </div>
  </header>
  <section class="box">
    <strong>Cliente</strong><br />
    ${escapeHtml(client?.name ?? "Sin cliente")}<br />
    ${escapeHtml(client?.phone ?? "")}<br />
    ${escapeHtml(job.address || client?.address || "")}
  </section>
  <section class="box">
    <strong>Trabajo</strong><br />
    ${escapeHtml(job.code)} · ${escapeHtml(job.serviceType)}<br />
    ${escapeHtml(job.symptoms)}<br />
    Equipo: ${escapeHtml(asset?.name ?? "-")} ${escapeHtml(asset?.brand ?? "")} ${escapeHtml(asset?.model ?? "")}
  </section>
  <h2>Detalle económico</h2>
  <table>
    <thead><tr><th>Concepto</th><th>Cantidad</th><th>Importe</th></tr></thead>
    <tbody>
      ${lines.map(([name, qty, amount]) => `<tr><td>${escapeHtml(name)}</td><td>${qty}</td><td>${amount}</td></tr>`).join("")}
    </tbody>
  </table>
  <section class="totals">
    <div><span>Subtotal</span><strong>${formatCurrency(printableTotals.subtotal)}</strong></div>
    <div><span>IVA 21%</span><strong>${formatCurrency(printableTotals.vat)}</strong></div>
    <div class="total"><span>Total</span><span>${formatCurrency(printableTotals.total)}</span></div>
  </section>
  <h2>Notas</h2>
  <p>${escapeHtml(job.notesClient || job.description || (kind === "factura" ? "Factura emitida por trabajos realizados." : "Presupuesto sujeto a validación final tras revisión técnica."))}</p>
</body>
</html>`;

    const documentWindow = window.open("", "_blank");
    if (!documentWindow) {
      return;
    }
    documentWindow.document.write(html);
    documentWindow.document.close();
  };

  const exportFiscalPack = () => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      period: fiscalSummary.quarterLabel,
      totals: {
        salesSubtotal: roundMoney(fiscalSummary.salesSubtotal),
        outputVat: roundMoney(fiscalSummary.outputVat),
        invoicedTotal: roundMoney(fiscalSummary.invoicedTotal),
        collectedTotal: roundMoney(fiscalSummary.collectedTotal),
        expensesSubtotal: roundMoney(fiscalSummary.expensesSubtotal),
        inputVat: roundMoney(fiscalSummary.inputVat),
        expensesTotal: roundMoney(fiscalSummary.expensesTotal),
        vatDue: roundMoney(fiscalSummary.vatDue),
        estimatedResult: roundMoney(fiscalSummary.estimatedResult),
      },
      invoices: fiscalSummary.issuedInvoices.map((invoice) => {
        const job = data.jobs.find((entry) => entry.id === invoice.jobId);
        const client = job?.clientId ? clientsById.get(job.clientId) : undefined;
        return {
          number: invoice.invoiceNumber,
          issuedAt: invoice.issuedAt,
          status: invoice.status,
          client: client?.name ?? "",
          jobCode: job?.code ?? "",
          subtotal: roundMoney(invoice.subtotal),
          vat: roundMoney(invoice.vat),
          total: roundMoney(invoice.total),
          paymentMethod: invoice.method,
          paidAt: invoice.paidAt,
        };
      }),
      expenses: fiscalSummary.quarterExpenses,
      notes: [
        "Exportación operativa para gestoría. No sustituye revisión fiscal profesional.",
        "Adjuntar PDFs/fotos de facturas emitidas y justificantes de gasto antes de presentar modelos.",
      ],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `astoreka-gestoria-${fiscalSummary.quarterKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setQuickActionMessage(`Paquete de gestoría ${fiscalSummary.quarterLabel} preparado.`);
  };

  const currentClient = selectedJob?.clientId ? clientsById.get(selectedJob.clientId) : undefined;
  const currentAsset = selectedJob?.assetId ? assetsById.get(selectedJob.assetId) : undefined;
  const currentInvoice = selectedJob ? invoicesByJob.get(selectedJob.id) : undefined;
  const currentEstimateWhatsAppHref = selectedJob
    ? getWhatsAppHref(selectedJob.id, "presupuesto")
    : undefined;
  const currentInvoiceWhatsAppHref = selectedJob
    ? getWhatsAppHref(selectedJob.id, "factura")
    : undefined;

  useEffect(() => {
    if (typeof window === "undefined" || !isN8nConfigured()) {
      return;
    }

    let active = true;
    const flush = () => {
      if (!active) {
        return;
      }

      void flushQueuedN8nEvents().catch(() => undefined);
    };

    flush();
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);

    return () => {
      active = false;
      window.removeEventListener("online", flush);
      window.removeEventListener("focus", flush);
    };
  }, []);

  const getSelectedOrFirstActiveJob = () =>
    selectedJob ??
    jobs.find((job) =>
      ["nuevo", "asignado", "programado", "en_camino", "en_curso", "diagnosticado"].includes(
        job.status,
      ),
    ) ??
    jobs[0];

  const getSelectedOrFirstContactableJob = () =>
    selectedJob ??
    jobs.find((job) => {
      const client = job.clientId ? clientsById.get(job.clientId) : undefined;
      return Boolean(client?.phone);
    }) ??
    jobs[0];

  const getCollectionTargetJob = () => {
    if (
      selectedJob &&
      (selectedJob.status === "facturado" ||
        invoicesByJob.get(selectedJob.id)?.status === "emitida")
    ) {
      return selectedJob;
    }

    const pendingInvoice = data.invoices.find((invoice) => invoice.status !== "cobrada");
    return pendingInvoice ? jobs.find((job) => job.id === pendingInvoice.jobId) : undefined;
  };

  const quickScheduleVisit = () => {
    const job = getSelectedOrFirstActiveJob();
    if (!job) {
      setQuickActionMessage("Crea un aviso antes de programar una visita.");
      setNewDialog("aviso");
      return;
    }
    openScheduleDialog(job.id);
    setQuickActionMessage(`Preparando cita para ${job.code}.`);
  };

  const quickWhatsApp = () => {
    const job = getSelectedOrFirstContactableJob();
    if (!job) {
      setQuickActionMessage("Crea un aviso con cliente antes de preparar WhatsApp.");
      setNewDialog("aviso");
      return;
    }
    setSelectedJobId(job.id);
    void copyWhatsApp(job.id, "visita", true);
  };

  const quickMarkCollected = () => {
    const job = getCollectionTargetJob();
    if (!job) {
      setSection("facturas");
      setQuickActionMessage("No hay facturas pendientes de cobro.");
      return;
    }
    setSelectedJobId(job.id);
    markCollected(job.id);
    setSection("facturas");
    setQuickActionMessage(`${job.code} marcado como cobrado.`);
  };

  const refreshFromLogo = () => {
    setQuickActionMessage("Actualizando.");

    const timeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1200);
    });

    void Promise.race([
      (async () => {
        if (isCloudConfigured()) {
          await syncFromCloud();
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.update()));
        }
      })(),
      timeout,
    ]).finally(() => {
      window.location.reload();
    });
  };

  const quickActions = (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Button
          size="sm"
          onClick={() => {
            setNewDialog("aviso");
            setQuickActionMessage("Creando aviso nuevo.");
          }}
        >
          <Plus />
          Crear aviso
        </Button>
        <Button size="sm" variant="outline" onClick={quickScheduleVisit}>
          <CalendarDays />
          Programar
        </Button>
        <Button size="sm" variant="outline" onClick={quickWhatsApp}>
          <Copy />
          WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={quickMarkCollected}>
          <Euro />
          Cobrado
        </Button>
      </div>
      {quickActionMessage ? (
        <p className="mt-2 text-xs text-muted-foreground">{quickActionMessage}</p>
      ) : null}
    </>
  );

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-3 py-4 sm:px-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)]">
          <div className="flex h-full flex-col rounded-lg border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-xl">
            <div className="border-b border-sidebar-border/70 pb-5">
              <button
                aria-label="Actualizar Astoreka"
                className="block w-full border-0 bg-transparent p-0 text-left outline-none"
                onClick={() => void refreshFromLogo()}
              >
                <AstorekaBrandHero
                  className="items-start gap-3"
                  logoClassName="h-20 w-auto"
                  wordmarkClassName="w-full max-w-none object-contain"
                  taglineClassName="max-w-none text-lg font-semibold leading-tight text-sidebar-foreground"
                  contentClassName="items-start text-left"
                />
              </button>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55">
                Centro operativo SAT
              </p>
            </div>

            <nav className="mt-5 space-y-1">
              {NAV_ITEMS.map((item) => {
                const ActiveIcon = item.icon;
                const active =
                  section === item.key || (section === "trabajo" && item.key === "trabajos");
                return (
                  <Button
                    key={item.key}
                    variant="ghost"
                    size="sm"
                    className={`h-10 w-full justify-start rounded-md px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                      active
                        ? "border-l-4 border-sidebar-primary bg-sidebar-accent pl-2 text-sidebar-accent-foreground"
                        : ""
                    }`}
                    onClick={() => setSection(item.key)}
                  >
                    <ActiveIcon className="size-4" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 border-t border-sidebar-border/70 pt-4">
              <Button className="w-full justify-start" onClick={() => setNewDialog("aviso")}>
                <Plus />
                Crear aviso
              </Button>
              <div className="space-y-2 text-xs text-sidebar-foreground/65">
                <div className="flex items-center justify-between">
                  <span>Supabase</span>
                  <Badge variant={cloudState.status === "ready" ? "default" : "outline"}>
                    {cloudState.status === "ready" ? "activo" : "listo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Modo</span>
                  <Badge variant="secondary">simple</Badge>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="rounded-[1.75rem] border border-border/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,#fffaf4_38%,#ffffff_100%)] p-4 shadow-sm lg:p-6">
            <div className="min-w-0">
              <button
                aria-label="Actualizar Astoreka"
                className="mb-4 block w-full border-0 bg-transparent p-0 text-left outline-none"
                onClick={() => void refreshFromLogo()}
              >
                <AstorekaBrandHero
                  className="justify-center items-center"
                  logoClassName="h-20 w-auto sm:h-24 lg:h-28"
                  wordmarkClassName="w-full max-w-none object-contain"
                  taglineClassName="max-w-[34rem] text-lg font-semibold leading-tight text-foreground sm:text-2xl"
                  contentClassName="items-center text-center"
                />
              </button>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#f97316]/20 pt-4">
                <h1 className="text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
                  Centro operativo
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isCloudConfigured() ? "default" : "outline"}>
                    {cloudState.status === "ready"
                      ? "Supabase activo"
                      : isCloudConfigured()
                        ? "Supabase listo"
                        : "Local primero"}
                  </Badge>
                  <Badge variant="secondary">Monousuario</Badge>
                </div>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Avisos, agenda, trabajos, facturas y administración para una operación sencilla.
              </p>
              {quickActions}
            </div>
          </header>

          {isCloudConfigured() ? (
            <section className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-md border bg-background p-2">
                  <Cloud className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {cloudState.status === "ready" || cloudState.status === "syncing"
                      ? `Nube conectada: ${cloudState.email}`
                      : cloudState.status === "error"
                        ? "Revisar sincronización"
                        : "Nube preparada"}
                  </p>
                  <p className="text-xs text-muted-foreground">{cloudState.message}</p>
                </div>
              </div>

              {cloudState.status === "ready" || cloudState.status === "syncing" ? (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncFromCloud}
                    disabled={cloudBusy || cloudState.status === "syncing"}
                  >
                    <RefreshCcw />
                    Sincronizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloudSignOut}
                    disabled={cloudBusy}
                  >
                    <LogOut />
                    Salir
                  </Button>
                </div>
              ) : (
                <form
                  className="grid gap-2 sm:grid-cols-[minmax(160px,220px)_minmax(160px,180px)_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCloudSignIn();
                  }}
                >
                  <Input
                    type="email"
                    placeholder="Email"
                    value={cloudForm.email}
                    onChange={(event) =>
                      setCloudForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <Input
                    type="password"
                    placeholder="Contraseña"
                    value={cloudForm.password}
                    onChange={(event) =>
                      setCloudForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                  <Button size="sm" type="submit" disabled={cloudBusy}>
                    <LogIn />
                    Entrar
                  </Button>
                </form>
              )}
            </section>
          ) : null}

          <section className="lg:hidden">
            <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-14px_35px_rgba(15,23,18,0.12)] backdrop-blur">
              <button
                className={`grid min-h-14 justify-items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium ${
                  section === "inicio" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setSection("inicio")}
              >
                <LayoutDashboard className="size-5" />
                Inicio
              </button>
              <button
                className="grid min-h-14 justify-items-center gap-1 rounded-md bg-primary px-1 py-2 text-[11px] font-semibold text-primary-foreground"
                onClick={() => setNewDialog("aviso")}
              >
                <Plus className="size-5" />
                Nuevo
              </button>
              <button
                className={`grid min-h-14 justify-items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium ${
                  section === "agenda" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setSection("agenda")}
              >
                <CalendarDays className="size-5" />
                Agenda
              </button>
              <button
                className={`grid min-h-14 justify-items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium ${
                  section === "trabajos" || section === "trabajo"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setSection("trabajos")}
              >
                <Search className="size-5" />
                Buscar
              </button>
              <Select
                value={NAV_ITEM_KEYS.includes(section) ? section : "more"}
                onValueChange={(value) => {
                  if (value !== "more") {
                    setSection(value as MainSection);
                  }
                }}
              >
                <SelectTrigger className="grid h-14 justify-items-center gap-1 border-0 bg-transparent px-1 py-2 text-[11px] text-muted-foreground shadow-none [&>svg]:hidden">
                  <MoreHorizontal className="size-5" />
                  <span>Más</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="more">Más secciones</SelectItem>
                  {MOBILE_MORE_SECTIONS.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog
              open={newDialog !== ""}
              onOpenChange={(open) => {
                if (!open) {
                  setNewDialog("");
                  setNewJobError("");
                }
              }}
            >
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo</DialogTitle>
                  <DialogDescription>
                    Crear aviso, presupuesto, cliente, equipo o cita.
                  </DialogDescription>
                </DialogHeader>

                <Tabs
                  value={newDialog || "aviso"}
                  onValueChange={(value) => setNewDialog(value as typeof newDialog)}
                >
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-6">
                    <TabsTrigger value="aviso">Aviso</TabsTrigger>
                    <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
                    <TabsTrigger value="cliente">Cliente</TabsTrigger>
                    <TabsTrigger value="equipo">Equipo</TabsTrigger>
                    <TabsTrigger value="cita">Cita</TabsTrigger>
                  </TabsList>

                  <TabsContent value="aviso" className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Entrada rápida sin importe. Sirve para llamadas, WhatsApp o avisos desde
                      Telegram.
                    </p>
                    {newJobError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                        {newJobError}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Síntoma *</Label>
                        <Input
                          required
                          value={newJob.symptoms}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, symptoms: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cliente *</Label>
                        <Select
                          value={newJob.clientId}
                          onValueChange={(value) =>
                            setNewJob((prev) => ({ ...prev, clientId: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Dirección *</Label>
                        <Input
                          required
                          value={newJob.address}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, address: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Técnico *</Label>
                        <Input
                          required
                          value={newJob.technician}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, technician: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select
                          value={newJob.priority}
                          onValueChange={(value) =>
                            setNewJob((prev) => ({ ...prev, priority: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Horas estimadas</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.25"
                          value={newJob.estimatedHours}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, estimatedHours: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Distancia (km)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={newJob.distanceKm}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, distanceKm: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Descripción inicial *</Label>
                        <Textarea
                          required
                          value={newJob.description}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button onClick={() => createJob("aviso")}>Crear aviso</Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="presupuesto" className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Crea trabajo presupuestado con mano de obra, salida, kilómetros, IVA y PDF.
                    </p>
                    {newJobError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                        {newJobError}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Síntoma / trabajo *</Label>
                        <Input
                          required
                          value={newJob.symptoms}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, symptoms: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cliente *</Label>
                        <Select
                          value={newJob.clientId}
                          onValueChange={(value) =>
                            setNewJob((prev) => ({ ...prev, clientId: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Dirección *</Label>
                        <Input
                          required
                          value={newJob.address}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, address: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horas estimadas *</Label>
                        <Input
                          required
                          type="number"
                          min="0"
                          step="0.25"
                          value={newJob.estimatedHours}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, estimatedHours: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Distancia (km)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={newJob.distanceKm}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, distanceKm: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Técnico *</Label>
                        <Input
                          required
                          value={newJob.technician}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, technician: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select
                          value={newJob.priority}
                          onValueChange={(value) =>
                            setNewJob((prev) => ({ ...prev, priority: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Detalle para el cliente *</Label>
                        <Textarea
                          required
                          value={newJob.description}
                          onChange={(event) =>
                            setNewJob((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button onClick={() => createJob("presupuesto")}>Crear presupuesto</Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="cliente" className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Nombre</Label>
                        <Input
                          value={newClient.name}
                          onChange={(event) =>
                            setNewClient((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input
                          value={newClient.phone}
                          onChange={(event) =>
                            setNewClient((prev) => ({ ...prev, phone: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zona</Label>
                        <Input
                          value={newClient.zone}
                          onChange={(event) =>
                            setNewClient((prev) => ({ ...prev, zone: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Dirección principal</Label>
                        <Input
                          value={newClient.address}
                          onChange={(event) =>
                            setNewClient((prev) => ({ ...prev, address: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button onClick={createClient}>Crear cliente</Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="equipo" className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cliente propietario</Label>
                        <Select
                          value={newAsset.clientId}
                          onValueChange={(value) =>
                            setNewAsset((prev) => ({ ...prev, clientId: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                          value={newAsset.category}
                          onValueChange={(value) =>
                            setNewAsset((prev) => ({ ...prev, category: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lavadora">Lavadora</SelectItem>
                            <SelectItem value="lavavajillas">Lavavajillas</SelectItem>
                            <SelectItem value="secadora">Secadora</SelectItem>
                            <SelectItem value="alumbrado">Alumbrado</SelectItem>
                            <SelectItem value="mecanismo">Mecanismo</SelectItem>
                            <SelectItem value="termo">Termo</SelectItem>
                            <SelectItem value="caldera">Caldera</SelectItem>
                            <SelectItem value="frigorifico">Frigorífico</SelectItem>
                            <SelectItem value="instalacion_electrica">
                              Instalación eléctrica
                            </SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={newAsset.name}
                          onChange={(event) =>
                            setNewAsset((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Marca</Label>
                        <Input
                          value={newAsset.brand}
                          onChange={(event) =>
                            setNewAsset((prev) => ({ ...prev, brand: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input
                          value={newAsset.model}
                          onChange={(event) =>
                            setNewAsset((prev) => ({ ...prev, model: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Número de serie</Label>
                        <Input
                          value={newAsset.serial}
                          onChange={(event) =>
                            setNewAsset((prev) => ({ ...prev, serial: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button onClick={createAsset}>Crear equipo</Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="material" className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Material</Label>
                        <Input
                          value={newMaterial.name}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          value={newMaterial.sku}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, sku: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Proveedor</Label>
                        <Input
                          value={newMaterial.provider}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, provider: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={newMaterial.quantity}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, quantity: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mínimo</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={newMaterial.minimum}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, minimum: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Coste</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newMaterial.cost}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, cost: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Venta</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newMaterial.salePrice}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, salePrice: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ubicación</Label>
                        <Input
                          value={newMaterial.location}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({ ...prev, location: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Compatibilidad</Label>
                        <Input
                          value={newMaterial.compatibility}
                          onChange={(event) =>
                            setNewMaterial((prev) => ({
                              ...prev,
                              compatibility: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button onClick={createMaterial}>Crear material</Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="cita" className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Elige el trabajo y la fecha. Al guardar queda programado y se abre el día en
                      Agenda.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Trabajo</Label>
                        <Select
                          value={scheduleDraft.jobId}
                          onValueChange={(value) => {
                            const job = jobs.find((item) => item.id === value);
                            setScheduleDraft({
                              jobId: value,
                              scheduledAt: job?.scheduledAt || toDateKey(new Date()),
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar trabajo" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map((job) => {
                              const client = job.clientId
                                ? clientsById.get(job.clientId)
                                : undefined;
                              return (
                                <SelectItem key={job.id} value={job.id}>
                                  {job.code} · {client?.name ?? "Sin cliente"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input
                          type="date"
                          value={scheduleDraft.scheduledAt}
                          onChange={(event) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              scheduledAt: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <div className="flex min-h-9 items-center rounded-md border bg-secondary/30 px-3 text-sm">
                          {scheduleJob ? <WorkStatusBadge status={scheduleJob.status} /> : "-"}
                        </div>
                      </div>
                      {scheduleJob ? (
                        <div className="rounded-md border bg-secondary/30 p-3 text-sm sm:col-span-2">
                          <p className="font-medium">{scheduleJob.symptoms}</p>
                          <p className="text-muted-foreground">
                            {scheduleJob.address || "Sin dirección"} ·{" "}
                            {scheduleJob.technician || "Sin técnico"}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDialog("")}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={scheduleVisit}
                        disabled={!scheduleDraft.jobId || !scheduleDraft.scheduledAt}
                      >
                        Agendar visita
                      </Button>
                    </DialogFooter>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </section>

          {section === "inicio" && (
            <section className="space-y-4">
              <Card className="overflow-hidden lg:hidden">
                <CardHeader className="border-b bg-secondary/20">
                  <CardTitle>Trabajos de hoy</CardTitle>
                  <CardDescription>Vista rápida para técnico en móvil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {todayJobs.length > 0 ? (
                    todayJobs.slice(0, 5).map((job) => {
                      const client = job.clientId ? clientsById.get(job.clientId) : undefined;
                      return (
                        <button
                          key={job.id}
                          className="grid w-full gap-2 rounded-md border bg-card p-3 text-left shadow-sm"
                          onClick={() => openJob(job.id)}
                        >
                          <span className="grid gap-2">
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">
                                {job.code} · {client?.name ?? "Sin cliente"}
                              </span>
                              <span className="mt-1 block truncate text-sm text-muted-foreground">
                                {job.symptoms || job.serviceType}
                              </span>
                            </span>
                            <WorkStatusBadge status={job.status} />
                          </span>
                          <span className="grid gap-1 text-xs text-muted-foreground">
                            <span>{job.address || client?.address || "Sin dirección"}</span>
                            <span>{getNextAction(job)}</span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-md border bg-secondary/30 p-3 text-sm text-muted-foreground">
                      No hay trabajos programados para hoy.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="hidden gap-3 sm:grid-cols-2 lg:grid xl:grid-cols-5">
                <KpiCard label="Trabajos abiertos" value={String(kpis.openJobs)} icon={Wrench} />
                <KpiCard
                  label="Visitas de hoy"
                  value={String(kpis.visitsToday)}
                  icon={CalendarDays}
                />
                <KpiCard
                  label="Pendiente de cobrar"
                  value={formatCurrency(kpis.pendingCollection)}
                  icon={Euro}
                />
                <KpiCard
                  label="Presupuestos pendientes"
                  value={String(kpis.pendingApproval)}
                  icon={FileText}
                />
                <KpiCard
                  label="Margen estimado mes"
                  value={formatCurrency(kpis.monthMargin)}
                  icon={TriangleAlert}
                />
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-secondary/20">
                  <CardTitle>Kanban operativo</CardTitle>
                  <CardDescription>
                    Entrada, planificación, ejecución, presupuesto y cierre.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid auto-cols-[minmax(170px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4 lg:grid-flow-row lg:grid-cols-3 xl:grid-cols-6">
                  {Object.entries(jobsByGroup).map(([groupKey, groupJobs]) => {
                    const group = groupKey as WorkGroup;
                    const isDragTarget = dragOverGroup === group;
                    return (
                      <div
                        key={group}
                        className={`min-h-[124px] space-y-2 rounded-md border bg-secondary/30 p-2 transition-colors ${
                          isDragTarget ? "border-primary bg-primary/10 ring-1 ring-primary/30" : ""
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverGroup(group);
                        }}
                        onDragLeave={() => setDragOverGroup(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          const jobId = event.dataTransfer.getData("text/plain") || draggingJobId;
                          if (jobId) {
                            moveJobToKanbanGroup(jobId, group);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{GROUP_LABELS[group]}</p>
                          <Badge variant="outline">{groupJobs.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {groupJobs.slice(0, 4).map((job) => (
                            <Button
                              key={job.id}
                              variant="outline"
                              size="sm"
                              draggable
                              className={`h-auto w-full min-w-0 cursor-grab justify-start rounded-sm bg-card p-2 text-left shadow-none active:cursor-grabbing ${
                                draggingJobId === job.id ? "opacity-60 ring-1 ring-primary/40" : ""
                              }`}
                              onClick={() => openJob(job.id)}
                              onDragStart={(event) => startJobDrag(event, job.id)}
                              onDragEnd={finishJobDrag}
                            >
                              <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                                <span className="font-medium">{job.code}</span>
                                <span className="truncate text-muted-foreground">
                                  {job.symptoms}
                                </span>
                                <span className="col-span-2">
                                  <WorkStatusBadge status={job.status} />
                                </span>
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-secondary/20">
                    <CardTitle>Necesita atención</CardTitle>
                    <CardDescription>
                      Sin dirección, pendiente pieza, aprobación o cobro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {needsAttention.map((job) => (
                      <div
                        key={job.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-card p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {job.code} · {job.symptoms}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {getNextAction(job)}
                          </p>
                        </div>
                        <WorkStatusBadge status={job.status} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {section === "trabajos" && (
            <section className="grid gap-4">
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/20">
                  <CardTitle>Trabajos</CardTitle>
                  <CardDescription>Cola operativa con filtros y acción siguiente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Código, cliente, técnico, síntoma"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as WorkStatus | "todos")}
                      >
                        <SelectTrigger className="w-[200px]">
                          <Filter />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          {ALL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Cobro</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => {
                          const client = job.clientId ? clientsById.get(job.clientId) : undefined;
                          const asset = job.assetId ? assetsById.get(job.assetId) : undefined;
                          const nextStatus = STEP_SUGGESTED_BY_STATUS[job.status];
                          const estimateWhatsAppHref = getWhatsAppHref(job.id, "presupuesto");
                          return (
                            <TableRow
                              key={job.id}
                              data-state={selectedJobId === job.id ? "selected" : undefined}
                              className="h-16 border-b hover:bg-secondary/45 data-[state=selected]:bg-primary/10"
                            >
                              <TableCell className="font-semibold">{job.code}</TableCell>
                              <TableCell>
                                <WorkStatusBadge status={job.status} />
                              </TableCell>
                              <TableCell>{job.scheduledAt || "-"}</TableCell>
                              <TableCell>{client?.name ?? "Sin cliente"}</TableCell>
                              <TableCell>{asset?.name ?? "-"}</TableCell>
                              <TableCell>
                                {job.totals.total > 0
                                  ? formatCurrency(job.totals.total)
                                  : "Sin presupuesto"}
                              </TableCell>
                              <TableCell>
                                {job.status === "facturado"
                                  ? "Pendiente"
                                  : job.status === "cobrado"
                                    ? "Cobrado"
                                    : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openJob(job.id)}
                                  >
                                    Abrir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyWhatsApp(job.id, "visita")}
                                  >
                                    <Phone />
                                  </Button>
                                  {job.totals.total > 0 ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openPrintableDocument("presupuesto", job.id)}
                                      >
                                        <FileDown />
                                        PDF
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        asChild={Boolean(estimateWhatsAppHref)}
                                        onClick={
                                          estimateWhatsAppHref
                                            ? undefined
                                            : () =>
                                                void prepareDocumentForWhatsApp(
                                                  "presupuesto",
                                                  job.id,
                                                )
                                        }
                                      >
                                        {estimateWhatsAppHref ? (
                                          <a
                                            href={estimateWhatsAppHref}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() =>
                                              void prepareDocumentForWhatsApp("presupuesto", job.id)
                                            }
                                          >
                                            <Phone />
                                            WhatsApp PDF
                                          </a>
                                        ) : (
                                          <>
                                            <Phone />
                                            WhatsApp PDF
                                          </>
                                        )}
                                      </Button>
                                    </>
                                  ) : null}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => duplicateJob(job.id)}
                                  >
                                    Duplicar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markUrgent(job.id)}
                                  >
                                    Urgente
                                  </Button>
                                  {nextStatus ? (
                                    <Button
                                      size="sm"
                                      onClick={() => updateJobStatus(job.id, nextStatus)}
                                    >
                                      {formatStatusLabel(nextStatus)}
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {section === "trabajo" && (
            <section className="grid gap-4">
              <Card className="min-w-0 overflow-hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
                <CardHeader className="border-b bg-secondary/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Ficha de trabajo</CardTitle>
                      <CardDescription>Resumen, acciones y edición rápida.</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSection("trabajos")}>
                      <ChevronLeft />
                      Trabajos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedJob ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Selecciona un trabajo desde la cola.
                      </p>
                      <Button size="sm" onClick={() => setSection("trabajos")}>
                        Ver trabajos
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2 rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{selectedJob.code}</p>
                          <WorkStatusBadge status={selectedJob.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedJob.symptoms}</p>
                        <p className="text-xs">Cliente: {currentClient?.name ?? "Sin cliente"}</p>
                        <p className="text-xs">
                          Dirección: {selectedJob.address || "Sin dirección"}
                        </p>
                        <p className="text-xs">Técnico: {selectedJob.technician}</p>
                        <p className="text-xs">
                          Total estimado:{" "}
                          {selectedJob.totals.total > 0
                            ? formatCurrency(selectedJob.totals.total)
                            : "Sin presupuesto"}
                        </p>
                      </div>

                      <div className="rounded-md border bg-secondary/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Siguiente acción recomendada
                        </p>
                        <p className="text-sm font-medium">{getNextAction(selectedJob)}</p>
                      </div>

                      <div className="grid gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openScheduleDialog(selectedJob.id)}
                        >
                          Programar visita
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateJobStatus(selectedJob.id, "en_camino")}
                        >
                          En camino
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateJobStatus(selectedJob.id, "en_curso")}
                        >
                          Iniciar trabajo
                        </Button>
                        <Button size="sm" variant="outline" onClick={focusDiagnosisField}>
                          Añadir diagnóstico
                        </Button>
                        {selectedJob.totals.total > 0 && currentEstimateWhatsAppHref ? (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={currentEstimateWhatsAppHref}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() =>
                                void prepareDocumentForWhatsApp("presupuesto", selectedJob.id)
                              }
                            >
                              WhatsApp presupuesto PDF
                            </a>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void prepareDocumentForWhatsApp("presupuesto", selectedJob.id)
                            }
                            disabled={selectedJob.totals.total <= 0}
                          >
                            WhatsApp presupuesto PDF
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => convertJobToEstimate(selectedJob.id)}
                          disabled={selectedJob.totals.total > 0}
                        >
                          Crear presupuesto
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPrintableDocument("presupuesto", selectedJob.id)}
                          disabled={selectedJob.totals.total <= 0}
                        >
                          PDF presupuesto
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateJobStatus(selectedJob.id, "facturado")}
                          disabled={selectedJob.totals.total <= 0}
                        >
                          Facturar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markCollected(selectedJob.id)}
                          disabled={selectedJob.totals.total <= 0}
                        >
                          Marcar cobrado
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPrintableDocument("factura", selectedJob.id)}
                          disabled={!currentInvoice}
                        >
                          PDF factura
                        </Button>
                        {currentInvoice && currentInvoiceWhatsAppHref ? (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={currentInvoiceWhatsAppHref}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() =>
                                void prepareDocumentForWhatsApp("factura", selectedJob.id)
                              }
                            >
                              Enviar factura
                            </a>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void prepareDocumentForWhatsApp("factura", selectedJob.id)
                            }
                            disabled={!currentInvoice}
                          >
                            Enviar factura
                          </Button>
                        )}
                      </div>

                      <Tabs value={selectedJobTab} onValueChange={setSelectedJobTab}>
                        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0">
                          <TabsTrigger value="resumen">Resumen</TabsTrigger>
                          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
                          <TabsTrigger value="historial">Historial</TabsTrigger>
                        </TabsList>

                        <TabsContent value="resumen" className="space-y-3">
                          <div className="rounded-md border p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Aviso / síntoma</Label>
                                <Input
                                  value={selectedJob.symptoms}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      symptoms: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Select
                                  value={selectedJob.clientId ?? ""}
                                  onValueChange={(value) =>
                                    updateJobDetails(selectedJob.id, { clientId: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data.clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id}>
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Fecha prevista</Label>
                                <Input
                                  type="date"
                                  value={selectedJob.scheduledAt}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      scheduledAt: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Dirección</Label>
                                <Input
                                  value={selectedJob.address}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      address: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Técnico</Label>
                                <Input
                                  value={selectedJob.technician}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      technician: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Prioridad</Label>
                                <Select
                                  value={selectedJob.priority}
                                  onValueChange={(value) =>
                                    updateJobDetails(selectedJob.id, {
                                      priority: value as WorkPriority,
                                      urgent: value === "urgente",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="baja">Baja</SelectItem>
                                    <SelectItem value="media">Media</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="urgente">Urgente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Horas previstas</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  value={selectedJob.estimatedHours}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      estimatedHours: Number.parseFloat(event.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Distancia (km)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={selectedJob.distanceKm}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      distanceKm: Number.parseFloat(event.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Descripción inicial</Label>
                                <Textarea
                                  value={selectedJob.description}
                                  onChange={(event) =>
                                    updateJobDetails(selectedJob.id, {
                                      description: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <Label htmlFor="job-diagnosis">Diagnóstico</Label>
                          <Textarea
                            id="job-diagnosis"
                            ref={diagnosisFieldRef}
                            value={selectedJob.diagnosis}
                            onChange={(event) =>
                              updateJobDetails(selectedJob.id, { diagnosis: event.target.value })
                            }
                          />
                          <Label>Solución</Label>
                          <Textarea
                            value={selectedJob.solution}
                            onChange={(event) =>
                              updateJobDetails(selectedJob.id, { solution: event.target.value })
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() => saveDiagnosis(selectedJob.id)}
                            disabled={!selectedJob.diagnosis.trim()}
                          >
                            Guardar diagnóstico
                          </Button>
                        </TabsContent>

                        <TabsContent value="presupuesto" className="space-y-3 text-sm">
                          <div className="rounded-md border p-3">
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px_auto]">
                              <Select
                                value={materialLineDraft.materialId}
                                onValueChange={(value) =>
                                  setMaterialLineDraft((prev) => ({ ...prev, materialId: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Añadir material del stock" />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.materials.map((material) => (
                                    <SelectItem key={material.id} value={material.id}>
                                      {material.name} · {formatCurrency(material.salePrice)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={materialLineDraft.qty}
                                onChange={(event) =>
                                  setMaterialLineDraft((prev) => ({
                                    ...prev,
                                    qty: event.target.value,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                onClick={() => addPlannedMaterialToJob(selectedJob.id)}
                                disabled={!materialLineDraft.materialId}
                              >
                                Añadir
                              </Button>
                            </div>

                            {selectedJob.plannedMaterials.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {selectedJob.plannedMaterials.map((line) => (
                                  <div
                                    key={line.id}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-secondary/50 p-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-medium">{line.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {line.qty} x {formatCurrency(line.salePrice)} · coste{" "}
                                        {formatCurrency(line.qty * line.unitCost)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold">
                                        {formatCurrency(line.qty * line.salePrice)}
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          removePlannedMaterialFromJob(selectedJob.id, line.id)
                                        }
                                      >
                                        Quitar
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-muted-foreground">
                                Todavía no hay materiales presupuestados en este trabajo.
                              </p>
                            )}
                          </div>

                          {selectedJob.totals.total <= 0 ? (
                            <div className="rounded-md border p-3 text-sm text-muted-foreground">
                              Este trabajo es un aviso sin presupuesto. Cuando haya diagnóstico,
                              conviértelo a presupuestado desde las acciones o añade material desde
                              stock.
                            </div>
                          ) : (
                            <>
                              <div className="rounded-md border p-2">
                                <p>Mano de obra: {formatCurrency(selectedJob.totals.labor)}</p>
                                <p>Salida: {formatCurrency(selectedJob.totals.callOut)}</p>
                                <p>Kilometraje: {formatCurrency(selectedJob.totals.kmCost)}</p>
                                <p>
                                  Materiales: {formatCurrency(selectedJob.totals.materialsSale)}
                                </p>
                                <p className="font-medium">
                                  Subtotal: {formatCurrency(selectedJob.totals.subtotal)}
                                </p>
                                <p>IVA 21%: {formatCurrency(selectedJob.totals.vat)}</p>
                                <p className="font-semibold">
                                  Total: {formatCurrency(selectedJob.totals.total)}
                                </p>
                                <p>
                                  Margen estimado: {formatCurrency(selectedJob.totals.grossMargin)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPrintableDocument("presupuesto", selectedJob.id)}
                              >
                                <FileDown />
                                Abrir PDF
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                Fórmula: mano de obra + salida + kilometraje + materiales, con IVA
                                21%.
                              </p>
                            </>
                          )}
                        </TabsContent>

                        <TabsContent value="historial" className="space-y-2">
                          {data.events
                            .filter((event) => event.jobId === selectedJob.id)
                            .slice(0, 8)
                            .map((event) => (
                              <div key={event.id} className="rounded-md border p-2 text-xs">
                                <p className="font-medium">{event.eventType}</p>
                                <p>
                                  {event.fromStatus
                                    ? `${event.fromStatus} → ${event.toStatus}`
                                    : event.toStatus}
                                </p>
                                <p className="text-muted-foreground">{event.note}</p>
                              </div>
                            ))}
                        </TabsContent>
                      </Tabs>

                      <p className="text-xs text-muted-foreground">
                        Si afecta al estado real del negocio, vive primero en la app/base de datos.
                        Si es comunicación, repetición o integración, puede vivir en n8n.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {section === "agenda" && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-secondary/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Agenda</CardTitle>
                    <CardDescription>
                      Registro operativo por fecha, técnico y estado del aviso.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-md border bg-background">
                      <Button
                        aria-label="Periodo anterior"
                        size="icon"
                        variant="ghost"
                        onClick={() => shiftAgendaDate(-1)}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAgendaDate(toDateKey(new Date()))}
                      >
                        Hoy
                      </Button>
                      <Button
                        aria-label="Periodo siguiente"
                        size="icon"
                        variant="ghost"
                        onClick={() => shiftAgendaDate(1)}
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                    <div className="rounded-md border bg-background p-1">
                      <Button
                        size="sm"
                        variant={agendaView === "dia" ? "default" : "ghost"}
                        onClick={() => setAgendaView("dia")}
                      >
                        Día
                      </Button>
                      <Button
                        size="sm"
                        variant={agendaView === "semana" ? "default" : "ghost"}
                        onClick={() => setAgendaView("semana")}
                      >
                        Semana
                      </Button>
                      <Button
                        size="sm"
                        variant={agendaView === "mes" ? "default" : "ghost"}
                        onClick={() => setAgendaView("mes")}
                      >
                        Mes
                      </Button>
                      <Button
                        size="sm"
                        variant={agendaView === "horas" ? "default" : "ghost"}
                        onClick={() => setAgendaView("horas")}
                      >
                        Horas
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-0">
                <div className="flex flex-col gap-2 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold capitalize">
                      {formatAgendaRange(agendaBaseDate, agendaView)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {visibleAgendaJobs.length} trabajos visibles ·{" "}
                      {agendaJobs.filter((job) => job.status === "en_curso").length} en curso
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setNewDialog("aviso")}>
                    <Plus />
                    Nuevo aviso
                  </Button>
                </div>

                {agendaView === "semana" ? (
                  <div className="overflow-x-auto px-3 pb-4">
                    <div className="grid min-w-[920px] grid-cols-7 rounded-md border bg-background">
                      {agendaWeekDays.map((day, index) => {
                        const dateKey = toDateKey(day);
                        const dayJobs = agendaJobsByDate.get(dateKey) ?? [];
                        const isToday = dateKey === agendaTodayKey;
                        const isAgendaDropTarget = dragOverAgendaDate === dateKey;
                        return (
                          <div
                            key={dateKey}
                            className={`min-h-[560px] border-r transition-colors last:border-r-0 ${
                              isAgendaDropTarget ? "bg-primary/10 ring-1 ring-primary/30" : ""
                            }`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragOverAgendaDate(dateKey);
                            }}
                            onDragLeave={() => setDragOverAgendaDate(null)}
                            onDrop={(event) => dropJobOnAgendaDate(event, dateKey)}
                          >
                            <div
                              className={`sticky top-0 z-10 border-b bg-background px-3 py-2 ${
                                isToday ? "bg-primary/5" : ""
                              }`}
                            >
                              <button
                                className="block w-full rounded-sm text-left hover:text-primary"
                                onClick={() => openAgendaDay(dateKey)}
                              >
                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                  {WEEKDAY_LABELS[index]}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <p className="text-2xl font-semibold">{day.getDate()}</p>
                                  <Badge variant={isToday ? "default" : "outline"}>
                                    {dayJobs.length}
                                  </Badge>
                                </div>
                              </button>
                              <Button
                                className="mt-2 h-7 w-full text-xs"
                                size="sm"
                                variant="ghost"
                                onClick={() => openAgendaDay(dateKey)}
                              >
                                Ver día
                              </Button>
                              <Button
                                className="h-7 w-full text-xs"
                                size="sm"
                                variant="ghost"
                                onClick={() => openAgendaDay(dateKey, "horas")}
                              >
                                Por hora
                              </Button>
                            </div>
                            <div className="space-y-1 p-2">
                              {dayJobs.length === 0 ? (
                                <button
                                  className="flex h-24 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                                  onClick={() => openAgendaDay(dateKey)}
                                >
                                  Sin avisos
                                </button>
                              ) : (
                                dayJobs.map((job) => (
                                  <button
                                    key={job.id}
                                    draggable
                                    className={`block w-full min-w-0 cursor-grab rounded-sm border px-2 py-1.5 text-left text-xs shadow-sm hover:ring-1 hover:ring-primary/40 active:cursor-grabbing ${STATUS_CLASS[job.status]} ${
                                      draggingJobId === job.id
                                        ? "opacity-60 ring-1 ring-primary/40"
                                        : ""
                                    }`}
                                    onClick={() => openJobFromAgenda(job.id)}
                                    onDragStart={(event) => startJobDrag(event, job.id)}
                                    onDragEnd={finishJobDrag}
                                  >
                                    <p className="truncate font-semibold">
                                      {getAgendaClientName(job)}
                                    </p>
                                    <p className="truncate opacity-80">
                                      {job.code} · {job.technician || "Sin técnico"}
                                    </p>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : agendaView === "mes" ? (
                  <div className="px-3 pb-4">
                    <div className="grid grid-cols-7 rounded-t-md border border-b-0 bg-secondary/40">
                      {MONTH_WEEKDAY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 rounded-b-md border bg-background">
                      {agendaMonthDays.map((day) => {
                        const dateKey = toDateKey(day);
                        const dayJobs = agendaJobsByDate.get(dateKey) ?? [];
                        const isCurrentMonth = day.getMonth() === agendaBaseDate.getMonth();
                        const isToday = dateKey === agendaTodayKey;
                        const isSelected = dateKey === agendaSelectedKey;
                        const isAgendaDropTarget = dragOverAgendaDate === dateKey;
                        return (
                          <div
                            key={dateKey}
                            className={`min-h-28 border-r border-b p-2 text-left transition-colors last:border-r-0 ${
                              isCurrentMonth
                                ? "bg-background"
                                : "bg-secondary/25 text-muted-foreground"
                            } ${isSelected ? "ring-2 ring-primary ring-inset" : ""} ${
                              isAgendaDropTarget ? "bg-primary/10 ring-1 ring-primary/30" : ""
                            }`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragOverAgendaDate(dateKey);
                            }}
                            onDragLeave={() => setDragOverAgendaDate(null)}
                            onDrop={(event) => dropJobOnAgendaDate(event, dateKey)}
                          >
                            <button
                              className="flex w-full items-center justify-between gap-1 rounded-sm hover:text-primary"
                              onClick={() => openAgendaDay(dateKey)}
                            >
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                  isToday ? "bg-primary text-primary-foreground" : ""
                                }`}
                              >
                                {day.getDate()}
                              </span>
                              {dayJobs.length > 0 ? (
                                <Badge variant="outline">{dayJobs.length}</Badge>
                              ) : null}
                            </button>
                            <div className="mt-2 space-y-1">
                              {dayJobs.slice(0, 3).map((job) => (
                                <button
                                  key={job.id}
                                  draggable
                                  className={`block w-full cursor-grab truncate rounded-sm border px-1.5 py-1 text-left text-xs font-medium hover:ring-1 hover:ring-primary/40 active:cursor-grabbing ${STATUS_CLASS[job.status]} ${
                                    draggingJobId === job.id
                                      ? "opacity-60 ring-1 ring-primary/40"
                                      : ""
                                  }`}
                                  onClick={() => openJobFromAgenda(job.id)}
                                  onDragStart={(event) => startJobDrag(event, job.id)}
                                  onDragEnd={finishJobDrag}
                                >
                                  {getAgendaClientName(job)}
                                </button>
                              ))}
                              {dayJobs.length > 3 ? (
                                <button
                                  className="text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => openAgendaDay(dateKey)}
                                >
                                  +{dayJobs.length - 3} más
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : agendaView === "dia" ? (
                  <div
                    className={`space-y-3 px-4 pb-4 transition-colors ${
                      dragOverAgendaDate === agendaSelectedKey ? "bg-primary/5" : ""
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverAgendaDate(agendaSelectedKey);
                    }}
                    onDragLeave={() => setDragOverAgendaDate(null)}
                    onDrop={(event) => dropJobOnAgendaDate(event, agendaSelectedKey)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-secondary/25 p-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {agendaSelectedJobs.length} avisos en el día
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Si no tienen hora exacta todavía, se muestran como eventos del día.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setAgendaView("horas")}>
                        Por hora
                      </Button>
                    </div>

                    {agendaSelectedJobs.length === 0 ? (
                      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No hay avisos en este día.
                      </div>
                    ) : (
                      <div className="grid gap-2 lg:grid-cols-2">
                        {agendaSelectedJobs.map((job) => (
                          <div
                            key={job.id}
                            draggable
                            className={`cursor-grab rounded-md border bg-card p-3 active:cursor-grabbing ${
                              draggingJobId === job.id ? "opacity-60 ring-1 ring-primary/40" : ""
                            }`}
                            onDragStart={(event) => startJobDrag(event, job.id)}
                            onDragEnd={finishJobDrag}
                          >
                            <button
                              className="block w-full text-left"
                              onClick={() => openJobFromAgenda(job.id)}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold">{getAgendaClientName(job)}</p>
                                <WorkStatusBadge status={job.status} />
                              </div>
                              <p className="mt-1 text-sm">{job.symptoms || job.serviceType}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {job.code} · {job.technician || "Sin técnico"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {job.address || "Sin dirección"}
                              </p>
                            </button>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateJobStatus(job.id, "en_camino")}
                              >
                                Ruta
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateJobStatus(job.id, "en_curso")}
                              >
                                Inicio
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyWhatsApp(job.id, "visita")}
                              >
                                <Phone />
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 pb-4">
                    <div className="rounded-md border bg-background">
                      <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b bg-secondary/25">
                        <div className="border-r px-3 py-2 text-xs font-medium text-muted-foreground">
                          Hora
                        </div>
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                          Avisos
                        </div>
                      </div>
                      {agendaSelectedJobs.length > 0 ? (
                        <div
                          className={`grid grid-cols-[72px_minmax(0,1fr)] border-b transition-colors ${
                            dragOverAgendaDate === agendaSelectedKey ? "bg-primary/5" : ""
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverAgendaDate(agendaSelectedKey);
                          }}
                          onDragLeave={() => setDragOverAgendaDate(null)}
                          onDrop={(event) => dropJobOnAgendaDate(event, agendaSelectedKey)}
                        >
                          <div className="border-r px-3 py-3 text-xs font-medium text-muted-foreground">
                            Todo día
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-2">
                            {agendaSelectedJobs.map((job) => (
                              <button
                                key={job.id}
                                draggable
                                className={`min-w-40 cursor-grab rounded-sm border px-2 py-1.5 text-left text-xs shadow-sm hover:ring-1 hover:ring-primary/40 active:cursor-grabbing ${STATUS_CLASS[job.status]} ${
                                  draggingJobId === job.id
                                    ? "opacity-60 ring-1 ring-primary/40"
                                    : ""
                                }`}
                                onClick={() => openJobFromAgenda(job.id)}
                                onDragStart={(event) => startJobDrag(event, job.id)}
                                onDragEnd={finishJobDrag}
                              >
                                <p className="truncate font-semibold">{getAgendaClientName(job)}</p>
                                <p className="truncate opacity-80">
                                  {job.code} · {job.technician || "Sin técnico"}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {AGENDA_HOURS.map((hour) => (
                        <div key={hour} className="grid min-h-16 grid-cols-[72px_minmax(0,1fr)]">
                          <div className="border-r border-b px-3 py-3 text-xs text-muted-foreground">
                            {String(hour).padStart(2, "0")}:00
                          </div>
                          <button
                            aria-label={`Crear aviso a las ${String(hour).padStart(2, "0")}:00`}
                            className={`border-b px-3 py-3 text-left text-xs text-muted-foreground hover:bg-secondary/30 ${
                              dragOverAgendaDate === agendaSelectedKey ? "bg-primary/5" : ""
                            }`}
                            onClick={() => setNewDialog("aviso")}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragOverAgendaDate(agendaSelectedKey);
                            }}
                            onDragLeave={() => setDragOverAgendaDate(null)}
                            onDrop={(event) => dropJobOnAgendaDate(event, agendaSelectedKey)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {section === "clientes" && (
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Ficha con trabajos, equipos y saldo pendiente.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {data.clients.map((client) => {
                  const clientJobs = data.jobs.filter((job) => job.clientId === client.id);
                  const clientAssets = data.assets.filter((asset) => asset.clientId === client.id);
                  const pending = clientJobs
                    .filter((job) => job.status === "facturado")
                    .reduce((sum, job) => sum + job.totals.total, 0);
                  return (
                    <div key={client.id} className="space-y-2 rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{client.name}</p>
                        <Badge variant="outline">{client.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {client.phone} · {client.address}
                      </p>
                      <p>
                        Trabajos: {clientJobs.length} · Equipos: {clientAssets.length}
                      </p>
                      <p>Saldo pendiente: {formatCurrency(pending)}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {section === "equipos" && (
            <Card>
              <CardHeader>
                <CardTitle>Equipos / Activos</CardTitle>
                <CardDescription>Entidad propia con historial por equipo.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {data.assets.map((asset) => {
                  const owner = clientsById.get(asset.clientId);
                  const history = data.jobs.filter((job) => job.assetId === asset.id);
                  return (
                    <div key={asset.id} className="space-y-2 rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{asset.name}</p>
                        <Badge variant="outline">{asset.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {asset.brand} {asset.model} · {asset.serial}
                      </p>
                      <p>Cliente: {owner?.name ?? "-"}</p>
                      <p>Categoría: {asset.category}</p>
                      <p>Averías/trabajos: {history.length}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {section === "presupuestos" && (
            <Card>
              <CardHeader>
                <CardTitle>Presupuestos</CardTitle>
                <CardDescription>
                  Nacen desde trabajo, con cálculo completo y WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.estimates.map((estimate) => {
                  const job = data.jobs.find((entry) => entry.id === estimate.jobId);
                  const client = data.clients.find((entry) => entry.id === estimate.clientId);
                  const estimateWhatsAppHref = job
                    ? getWhatsAppHref(job.id, "presupuesto")
                    : undefined;
                  return (
                    <div
                      key={estimate.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {job?.code} · {client?.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Estado: {estimate.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{formatCurrency(estimate.total)}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => job && openPrintableDocument("presupuesto", job.id)}
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild={Boolean(estimateWhatsAppHref)}
                          onClick={
                            estimateWhatsAppHref || !job
                              ? undefined
                              : () => void prepareDocumentForWhatsApp("presupuesto", job.id)
                          }
                        >
                          {estimateWhatsAppHref && job ? (
                            <a
                              href={estimateWhatsAppHref}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => void prepareDocumentForWhatsApp("presupuesto", job.id)}
                            >
                              WhatsApp PDF
                            </a>
                          ) : (
                            "WhatsApp PDF"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {section === "facturas" && (
            <Card>
              <CardHeader>
                <CardTitle>Facturas / Cobros</CardTitle>
                <CardDescription>
                  Facturas emitidas, cobros, abonos y libro de ventas simplificado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid gap-3 pb-2 sm:grid-cols-3">
                  <InfoMetric
                    label="Pendiente de cobrar"
                    value={formatCurrency(erpSummary.pendingInvoiceTotal)}
                  />
                  <InfoMetric
                    label="Abonos activos"
                    value={formatCurrency(erpSummary.creditNoteTotal)}
                  />
                  <InfoMetric
                    label="Tesorería estimada"
                    value={formatCurrency(erpSummary.treasuryBalance)}
                  />
                </div>
                {data.invoices.map((invoice) => {
                  const job = data.jobs.find((entry) => entry.id === invoice.jobId);
                  const client = job?.clientId ? clientsById.get(job.clientId) : undefined;
                  const invoiceWhatsAppHref = job ? getWhatsAppHref(job.id, "factura") : undefined;
                  return (
                    <div
                      key={invoice.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {invoice.invoiceNumber} · {client?.name ?? "-"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job?.code} · {invoice.method}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={invoice.status === "cobrada" ? "secondary" : "destructive"}>
                          {invoice.status}
                        </Badge>
                        <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                        {job ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPrintableDocument("factura", job.id)}
                            >
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild={Boolean(invoiceWhatsAppHref)}
                              onClick={
                                invoiceWhatsAppHref
                                  ? undefined
                                  : () => void prepareDocumentForWhatsApp("factura", job.id)
                              }
                            >
                              {invoiceWhatsAppHref ? (
                                <a
                                  href={invoiceWhatsAppHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => void prepareDocumentForWhatsApp("factura", job.id)}
                                >
                                  Enviar
                                </a>
                              ) : (
                                "Enviar"
                              )}
                            </Button>
                          </>
                        ) : null}
                        {invoice.status !== "cobrada" ? (
                          <Button size="sm" onClick={() => job && markCollected(job.id)}>
                            Cobrada
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-md border">
                  <div className="border-b bg-secondary/25 px-3 py-2">
                    <p className="text-sm font-medium">Facturas de abono</p>
                    <p className="text-xs text-muted-foreground">
                      Ajustes y devoluciones asociados a facturas emitidas.
                    </p>
                  </div>
                  <div className="divide-y">
                    {data.creditNotes.map((creditNote) => {
                      const invoice = data.invoices.find(
                        (entry) => entry.id === creditNote.invoiceId,
                      );
                      return (
                        <div
                          key={creditNote.id}
                          className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {creditNote.reference} · {invoice?.invoiceNumber ?? "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">{creditNote.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{creditNote.status}</Badge>
                            <p className="font-semibold">{formatCurrency(creditNote.total)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "administracion" && (
            <section className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label={`Facturado ${fiscalSummary.quarterLabel}`}
                  value={formatCurrency(fiscalSummary.invoicedTotal)}
                  icon={Euro}
                />
                <KpiCard
                  label="IVA repercutido"
                  value={formatCurrency(fiscalSummary.outputVat)}
                  icon={FileText}
                />
                <KpiCard
                  label="IVA soportado"
                  value={formatCurrency(fiscalSummary.inputVat)}
                  icon={FileDown}
                />
                <KpiCard
                  label="IVA estimado"
                  value={formatCurrency(fiscalSummary.vatDue)}
                  icon={TriangleAlert}
                />
              </div>

              <Card>
                <CardHeader className="border-b bg-secondary/20">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div>
                      <CardTitle>Administración / Fiscalidad</CardTitle>
                      <CardDescription>
                        Resumen secundario para IVA, gastos, trimestre y envío a gestoría.
                      </CardDescription>
                    </div>
                    <Button onClick={exportFiscalPack}>
                      <FileDown />
                      Exportar gestoría
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <InfoMetric
                        label="Base ventas"
                        value={formatCurrency(fiscalSummary.salesSubtotal)}
                      />
                      <InfoMetric
                        label="Base gastos"
                        value={formatCurrency(fiscalSummary.expensesSubtotal)}
                      />
                      <InfoMetric
                        label="Cobrado"
                        value={formatCurrency(fiscalSummary.collectedTotal)}
                      />
                      <InfoMetric
                        label="Resultado aproximado"
                        value={formatCurrency(fiscalSummary.estimatedResult)}
                      />
                    </div>

                    <div className="rounded-md border">
                      <div className="border-b bg-secondary/25 px-3 py-2">
                        <p className="text-sm font-medium">Gastos del trimestre</p>
                        <p className="text-xs text-muted-foreground">
                          Materiales, vehículo, gestoría y justificantes pendientes.
                        </p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>IVA</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Justificante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fiscalSummary.quarterExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>{expense.date}</TableCell>
                              <TableCell>
                                <p className="font-medium">{expense.provider}</p>
                                <p className="text-xs text-muted-foreground">{expense.concept}</p>
                              </TableCell>
                              <TableCell>{expense.category}</TableCell>
                              <TableCell>{formatCurrency(expense.vat)}</TableCell>
                              <TableCell>{formatCurrency(expense.total)}</TableCell>
                              <TableCell>
                                <Badge variant={expense.receiptAttached ? "secondary" : "outline"}>
                                  {expense.receiptAttached ? "OK" : "Falta"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium">Checklist trimestre</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>Revisar facturas emitidas y anuladas.</li>
                        <li>Adjuntar tickets/facturas de gastos.</li>
                        <li>Separar IVA repercutido y soportado.</li>
                        <li>Exportar paquete para gestoría.</li>
                        <li>Confirmar modelos trimestrales antes de presentar.</li>
                      </ul>
                    </div>

                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium">Alertas administrativas</p>
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Facturas pendientes</span>
                          <Badge variant="outline">
                            {
                              fiscalSummary.issuedInvoices.filter(
                                (invoice) => invoice.status !== "cobrada",
                              ).length
                            }
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Gastos sin justificante</span>
                          <Badge
                            variant={
                              fiscalSummary.missingReceipts > 0 ? "destructive" : "secondary"
                            }
                          >
                            {fiscalSummary.missingReceipts}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Compras sin justificante</span>
                          <Badge
                            variant={
                              erpSummary.missingPurchaseReceipts > 0 ? "destructive" : "secondary"
                            }
                          >
                            {erpSummary.missingPurchaseReceipts}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Pago a proveedores</span>
                          <span className="font-semibold">
                            {formatCurrency(erpSummary.pendingPurchaseTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">IVA neto estimado</span>
                          <span className="font-semibold">
                            {formatCurrency(fiscalSummary.vatDue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium">Alcance</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Astoreka prepara la información y reduce despistes, pero la presentación
                        fiscal final queda para el autónomo o su gestoría.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Wrench;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-2xl font-semibold tracking-normal">{value}</p>
          </div>
          <div className="rounded-md border bg-secondary/50 p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkStatusBadge({ status }: { status: WorkStatus }) {
  return (
    <Badge
      variant="outline"
      className={`max-w-full truncate rounded-sm px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLASS[status]}`}
    >
      {formatStatusLabel(status)}
    </Badge>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
