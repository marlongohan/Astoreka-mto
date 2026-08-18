# Astoreka MTO

Gestor SAT para mantenimiento técnico operativo: rápido en móvil, con historial por equipo, partes digitales y control de cobros.

## Modo actual

- **Funcional en demo/localStorage** (sin depender del backend para la demo).
- **Preparado para backend en Lovable Cloud** (auth + base de datos + storage).
- **PWA instalable** con `manifest.webmanifest` e iconos.

## Flujo principal cubierto

- Dashboard operativo como primera pantalla (no landing).
- CRUD operativo de trabajos, clientes y equipos.
- Estados completos del trabajo + historial de cambios.
- Cálculo de presupuesto (IVA 21%, materiales, margen estimado).
- Acciones rápidas (WhatsApp, cambio de estado, marcar cobrado, duplicar).
- Administración secundaria con IVA repercutido/soportado, gastos, trimestre y exportación para gestoría.
- Exportación de datos en JSON.

## Conectar backend (siguiente paso)

1. Crear tablas y políticas RLS en Lovable Cloud (clients, assets, jobs, job_materials, invoices, job_events, photos, knowledge_base, profiles, user_roles).
2. Reemplazar el adaptador localStorage por lectura/escritura del backend.
3. Mantener **modo demo** como fallback para demos o cuando falle integración externa.

## Preparación n8n / Telegram / WhatsApp

- La app ya registra origen de trabajo e historial interno.
- Los botones de “preparar WhatsApp” generan texto copiable.
- La integración n8n usa `VITE_N8N_EVENT_WEBHOOK_URL` para eventos operativos.
- Rutas de producción preparadas:
  - Eventos: `https://n8n.markanhome.uk/webhook/astoreka/evento`
  - Trabajos: `https://n8n.markanhome.uk/webhook/astoreka/trabajo`
  - Presupuestos: `https://n8n.markanhome.uk/webhook/astoreka/presupuesto`
  - Facturas: `https://n8n.markanhome.uk/webhook/astoreka/factura`

## Stack

- TanStack Start (React + TypeScript)
- Tailwind CSS v4
- shadcn/ui
- Lucide Icons
