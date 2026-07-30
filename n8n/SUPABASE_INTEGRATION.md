# n8n + Supabase - Astoreka MTO

Estado: preparado a nivel de contrato, pendiente de activar con Supabase real.

## Papel de n8n

n8n no sera la base de datos. Actuara como automatizador.

Eventos previstos:

- `job_created`
- `job_status_changed`
- `invoice_requested`
- `payment_pending`
- `photo_uploaded`

## Webhook previsto

La app puede llamar a:

```text
POST /webhook/astoreka/trabajo
```

Payload base:

```json
{
  "eventType": "job_created",
  "payload": {
    "jobId": "uuid",
    "code": "MTO-20260623120000"
  },
  "sentAt": "2026-06-23T12:00:00.000Z"
}
```

## Automatizaciones recomendadas

### job_created

- Registrar log interno.
- Avisar a Telegram si es urgente.
- Preparar borrador de presupuesto/PDF.

### job_status_changed

- Si pasa a `aceptado`, crear tarea de ejecucion.
- Si pasa a `facturado`, programar seguimiento de cobro.
- Si pasa a `cobrado`, cerrar pendiente y actualizar resumen.

### payment_pending

- Recordatorio diario/semanal hasta cobro.

## Seguridad

El webhook debe validar un secreto compartido o HMAC antes de ejecutar acciones importantes.

No ejecutar acciones destructivas desde payloads externos sin validacion.
