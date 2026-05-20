# cashi-whatsapp-worker

Worker Node.js que verifica si un número de teléfono tiene WhatsApp activo.
Usa [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) para establecer
una sesión de WhatsApp Web con un número dedicado y consultar presencia vía `onWhatsApp()`.

**No envía mensajes.** Solo consulta si el número existe en WhatsApp.

Es invocado por `web-service-cashi` (paquete `com.cashi.whatsapp`) en el modelo NO-ortogonal V17+.
Alimenta la columna `cashi_db.metodos_contacto.estado_whatsapp`.

## Quickstart

```bash
npm install
cp .env.example .env
# Editar .env: BACKEND_URL, WORKER_TOKEN
npm run dev
```

En el **primer arranque** el worker imprime un QR en la terminal.
Escanearlo con el número de WhatsApp dedicado (Settings → Linked Devices → Link a Device).
Las credenciales se guardan en `wa-auth-keys/` y no se vuelve a pedir QR en reinicios.

## Endpoints del backend que consume

| Verbo | Ruta | Auth |
|---|---|---|
| GET | `/api/v1/whatsapp/queue?limit=N` | X-Worker-Token |
| POST | `/api/v1/whatsapp/result` | X-Worker-Token |

## Docker (producción)

```bash
# Primer arranque (para escanear QR):
docker compose run --rm whatsapp-worker

# Luego en background:
docker compose up -d
```

## Variables de entorno

Ver `.env.example`. Las más importantes:

- `BACKEND_URL`: URL de `web-service-cashi`
- `WORKER_TOKEN`: shared secret con el backend Java
- `BATCH_SIZE`: números a procesar por ciclo (default 10)
- `POLL_INTERVAL_MS`: intervalo de polling (default 30000 ms)

## Privacidad (Ley 29733)

- Los logs enmascaran el número: solo los últimos 3 dígitos son visibles (`****321`)
- No se almacena ningún dato personal del titular
- La sesión WA (`wa-auth-keys/`) contiene credenciales del número de trabajo, no datos de clientes
