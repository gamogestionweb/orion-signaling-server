# Orion Signaling Server

Servidor de señalización WebSocket para Orion Emergency Mesh.

## Desplegar en Railway (GRATIS)

1. Ve a https://railway.app y crea cuenta con GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Sube esta carpeta a un repo de GitHub, o usa "Empty Project" → "Add Service" → "Empty Service"
4. Si usas Empty Service:
   - Sube los archivos (server.js, package.json)
   - Railway detectará Node.js automáticamente
5. En Settings → Networking → Generate Domain
6. Copia la URL (ej: `orion-signal.up.railway.app`)
7. En Android, cambia la URL a: `wss://orion-signal.up.railway.app`

## Desplegar en Render (GRATIS)

1. Ve a https://render.com y crea cuenta
2. New → Web Service → Connect repo o subir archivos
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Copia la URL generada

## Variables de entorno

- `PORT`: Puerto del servidor (Railway/Render lo asignan automáticamente)

## Probar localmente

```bash
npm install
npm start
```

El servidor escuchará en el puerto 3000.
