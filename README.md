# Orion Signaling Server

**WebSocket signaling server for Orion Emergency Mesh Network**

This is a minimal, transparent relay server that enables peer discovery for the Orion emergency communication system. It does NOT store messages - it only helps devices find each other.

## What This Server Does

- **Peer Discovery**: Helps Orion devices find each other across the internet
- **Message Relay**: Forwards encrypted messages between peers (cannot read them)
- **Temporary Sync**: Holds messages briefly for offline peers (max 24h, then deleted)

## What This Server Does NOT Do

- **No message storage**: Messages are E2E encrypted and only relayed
- **No user accounts**: No registration, no passwords, no tracking
- **No logs of content**: Only connection metadata for debugging
- **No decryption**: Server cannot read any messages (ECDH + AES-GCM encryption)

## How Orion Emergency Mesh Works

Orion is a hybrid emergency communication system designed for disaster scenarios like the DANA Valencia flood (Spain, 2024).

### The Problem
During disasters, cell towers fail. People in affected areas (like Paiporta) cannot contact family in safe areas (like Madrid). WhatsApp, Telegram, Signal - all require working internet infrastructure.

### The Solution: Hybrid Mesh

```
[No Internet Zone]                    [Internet Zone]
     Paiporta                            Valencia                    Madrid
        |                                    |                          |
   Maria sends    ----WiFi Direct--->    Pedro         ----Internet---> Family
   "I'm alive"        (mesh)           walks out           (relay)     receives
                                       of zone                         message
```

**Step 1: Local Mesh (No Internet)**
- Devices communicate via WiFi Direct (peer-to-peer)
- Messages hop between nearby devices (up to 200m range each)
- Works without ANY infrastructure

**Step 2: Internet Bridge**
- When a device with mesh messages gets internet connectivity
- It connects to this signaling server
- Syncs all messages to other connected peers worldwide

**Step 3: Global Delivery**
- Messages propagate to all Orion users with internet
- Family members anywhere in the world receive the messages

## Technical Details

### Protocol
- WebSocket for real-time communication
- JSON message format
- Automatic reconnection with exponential backoff

### Message Types
```javascript
// Register with server
{ "type": "register", "peerId": "...", "publicKey": "..." }

// Broadcast to all peers
{ "type": "broadcast", "payload": { /* encrypted */ } }

// Request sync from peers
{ "type": "sync_request", "lastSync": timestamp }

// Response with messages
{ "type": "sync_response", "to": "peerId", "messages": [...] }
```

### Security
- All messages are E2E encrypted (ECDH key exchange + AES-256-GCM)
- Server only sees encrypted blobs
- Public keys exchanged via QR codes (out-of-band)
- No central authority can read messages

## Deploy Your Own

### Railway (Recommended - Free Tier)
1. Fork this repository
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Select the forked repo
5. Railway auto-detects Node.js and deploys
6. Go to Settings → Networking → Generate Domain
7. Use the URL in your Orion app: `wss://your-app.up.railway.app`

### Render (Alternative - Free Tier)
1. Fork this repository
2. Go to [render.com](https://render.com)
3. New → Web Service → Connect repo
4. Build Command: `npm install`
5. Start Command: `node server.js`

### Self-Hosted
```bash
git clone https://github.com/gamogestionweb/orion-signaling-server
cd orion-signaling-server
npm install
PORT=8080 node server.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port (Railway/Render set this automatically) |

## API Health Check

```bash
curl https://your-server.railway.app/
```

Returns:
```json
{
  "status": "ok",
  "service": "Orion Signaling Server",
  "peers": 5,
  "uptime": 3600
}
```

## License

MIT - Use it, fork it, improve it. This is emergency infrastructure.

## Related

- [Orion App](https://github.com/gamogestionweb/orion) - The Android application
- Built with love for humanity during disasters

---

*"When everything fails, mesh networks don't."*
