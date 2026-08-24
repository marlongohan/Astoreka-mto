# Workflows n8n

n8n es la capa de automatizacion, no el nucleo del producto.

La app de Astoreka debe guardar clientes, trabajos, estados, materiales, importes y cobros en su propia base de datos. n8n se usara para tareas alrededor del flujo principal: mensajes, PDFs, recordatorios, backups, informes e integraciones.

Regla: si una automatizacion se rompe, el trabajo debe seguir existiendo y poder gestionarse desde la app.

## 01_presupuesto_webhook.json

Webhook:

\`\`\`
POST /webhook/astoreka/presupuesto
\`\`\`

Ejemplo:

\`\`\`json
{
  "clientName": "Bar piloto",
  "description": "Revision de luces LED",
  "hours": 2,
  "distanceKm": 8,
  "urgent": false,
  "materials": [
    {"id": "led_driver_24w", "name": "Driver LED 24W", "qty": 2, "salePrice": 22}
  ]
}
\`\`\`

Devuelve subtotal, IVA, total y HTML imprimible.

## 02_factura_webhook.json

Webhook:

\`\`\`
POST /webhook/astoreka/factura
\`\`\`

Ejemplo:

\`\`\`json
{
  "clientName": "Bar piloto",
  "clientAddress": "Direccion pendiente",
  "lines": [
    {"description": "Revision alumbrado LED", "qty": 2, "unitPrice": 30},
    {"description": "Driver LED 24W", "qty": 2, "unitPrice": 22}
  ]
}
\`\`\`

Devuelve numero de factura, subtotal, IVA, total y HTML imprimible.

## 03_registro_trabajo_webhook.json

Webhook:

\`\`\`
POST /webhook/astoreka/trabajo
\`\`\`

Normaliza un trabajo entrante. En la siguiente iteracion se conectara a base de datos, Google Sheets, Airtable o archivo persistente.

## 04_eventos_operativos_webhook.json

Webhook recomendado para la app React:

\`\`\`
POST /webhook/astoreka/evento
\`\`\`

Configurar en la app como:

\`\`\`env
VITE_N8N_WEBHOOK_URL=https://TU-N8N/webhook/astoreka/evento
VITE_N8N_WEBHOOK_SECRET=un-secreto-compartido-largo
\`\`\`

Y en n8n definir:

\`\`\`env
ASTOREKA_WEBHOOK_SECRET=un-secreto-compartido-largo
\`\`\`

Eventos que emite la app:

- `job_created`
- `estimate_created`
- `job_status_changed`
- `invoice_created`
- `invoice_collected`

Si `VITE_N8N_WEBHOOK_URL` no existe o falla la llamada, la app no se bloquea: guarda el evento en una cola local para no perder la operación principal.

El workflow `04_eventos_operativos_webhook.json` ahora rechaza peticiones sin el header `x-astoreka-webhook-secret` correcto y responde con código HTTP 401/503 si falta validación. Sigue siendo una protección de secreto compartido; para firma fuerte o HMAC hay que mover la validación a un backend propio o proxy de confianza.
