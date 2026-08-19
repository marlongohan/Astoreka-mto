# Astoreka MTO

Gestor SAT para mantenimiento técnico operativo: rápido en móvil, con historial por equipo, partes digitales y control de cobros.

## Modo actual

- **MVP monousuario**: una sola persona gestiona avisos, agenda, trabajos, facturas y administración.
- **Funcional en demo/localStorage** (sin depender del backend para la demo).
- **Preparado para backend en Supabase** (auth + base de datos + storage).
- **Sincronización cloud por registros** en `astoreka_records`, con `app_snapshots` como compatibilidad temporal.
- **PWA instalable** con `manifest.webmanifest` e iconos.

## Flujo principal cubierto

- Dashboard operativo como primera pantalla (no landing).
- CRUD operativo de trabajos, clientes y equipos.
- Estados completos del trabajo + historial de cambios.
- Cálculo de presupuesto (IVA 21%, materiales, margen estimado).
- Acciones rápidas (WhatsApp, cambio de estado, marcar cobrado, duplicar).
- Administración secundaria con IVA repercutido/soportado, gastos, trimestre y exportación para gestoría.
- Exportación de datos en JSON.

## Enfoque de producto

- La navegación visible se mantiene corta: Inicio, Trabajos, Agenda, Clientes, Equipos, Facturas/Cobros y Administración.
- Stock, compras, abonos, informes avanzados, ajustes internos y n8n quedan como base futura, no como flujo principal del MVP.
- No se construyen roles/permisos todavía: la app se enfoca en propietario único y deja `owner_id` preparado para crecer.

## Backend profesional

- Supabase es la fuente de verdad de la app: auth, datos operativos y storage.
- La app guarda cada cliente, trabajo, equipo, factura, material, compra y evento como registro independiente.
- `app_snapshots` queda como respaldo temporal para instalaciones antiguas.
- `localStorage` queda como modo demo y continuidad si falla la red.
- n8n no guarda el núcleo del negocio; solo automatiza tareas alrededor del flujo principal.

## Siguiente paso de datos

1. Aplicar las migraciones de Supabase en el proyecto cloud.
2. Migrar los snapshots existentes a `astoreka_records` al iniciar sesión.
3. Cuando esté validado en producción, retirar el fallback `app_snapshots`.

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
