/**
 * Orion Signaling Server v1.0
 *
 * Servidor WebSocket minimalista para señalización P2P.
 * NO almacena mensajes - solo facilita el intercambio de IPs entre peers.
 *
 * Los mensajes van directo P2P después de la conexión inicial.
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// Peers conectados: Map<peerId, {ws, publicKey, lastSeen}>
const peers = new Map();

// Mensajes pendientes: Map<destinoPeerId, Array<mensaje>>
// Solo se guardan temporalmente hasta que el peer se conecte
const pendingMessages = new Map();

// Limpiar mensajes pendientes después de 24 horas
const MESSAGE_TTL = 24 * 60 * 60 * 1000;

const wss = new WebSocket.Server({ port: PORT });

console.log(`🚀 Orion Signaling Server iniciado en puerto ${PORT}`);

wss.on('connection', (ws, req) => {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    console.log(`📱 Nueva conexión desde ${clientIp}`);

    let peerId = null;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            switch (msg.type) {
                case 'register':
                    // Registrar peer con su ID y clave pública
                    peerId = msg.peerId;
                    peers.set(peerId, {
                        ws,
                        publicKey: msg.publicKey,
                        ip: clientIp,
                        lastSeen: Date.now()
                    });

                    console.log(`✅ Peer registrado: ${peerId.substring(0, 8)}... (${peers.size} total)`);

                    // Enviar lista de peers activos
                    const peerList = [];
                    peers.forEach((peer, id) => {
                        if (id !== peerId && peer.ws.readyState === WebSocket.OPEN) {
                            peerList.push({
                                peerId: id,
                                publicKey: peer.publicKey
                            });
                        }
                    });

                    ws.send(JSON.stringify({
                        type: 'peers',
                        peers: peerList
                    }));

                    // Notificar a otros peers del nuevo peer
                    broadcast(peerId, {
                        type: 'peer_joined',
                        peerId: peerId,
                        publicKey: msg.publicKey
                    });

                    // Entregar mensajes pendientes
                    if (pendingMessages.has(peerId)) {
                        const pending = pendingMessages.get(peerId);
                        pending.forEach(pendingMsg => {
                            ws.send(JSON.stringify(pendingMsg));
                        });
                        pendingMessages.delete(peerId);
                        console.log(`📨 Entregados ${pending.length} mensajes pendientes a ${peerId.substring(0, 8)}...`);
                    }
                    break;

                case 'relay':
                    // Retransmitir mensaje a un peer específico
                    const targetPeer = peers.get(msg.to);

                    const relayMsg = {
                        type: 'message',
                        from: peerId,
                        payload: msg.payload,
                        timestamp: Date.now()
                    };

                    if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
                        targetPeer.ws.send(JSON.stringify(relayMsg));
                    } else {
                        // Guardar para cuando se conecte
                        if (!pendingMessages.has(msg.to)) {
                            pendingMessages.set(msg.to, []);
                        }
                        pendingMessages.get(msg.to).push(relayMsg);
                        console.log(`💾 Mensaje guardado para ${msg.to.substring(0, 8)}... (offline)`);
                    }
                    break;

                case 'broadcast':
                    // Mensaje para todos los peers (sincronización de mensajes de emergencia)
                    broadcast(peerId, {
                        type: 'broadcast',
                        from: peerId,
                        payload: msg.payload,
                        timestamp: Date.now()
                    });
                    break;

                case 'sync_request':
                    // Solicitar sincronización de mensajes
                    // Reenviar a todos los peers para que respondan con sus mensajes
                    broadcast(peerId, {
                        type: 'sync_request',
                        from: peerId,
                        lastSync: msg.lastSync || 0
                    });
                    break;

                case 'sync_response':
                    // Respuesta de sincronización a un peer específico
                    const requester = peers.get(msg.to);
                    if (requester && requester.ws.readyState === WebSocket.OPEN) {
                        requester.ws.send(JSON.stringify({
                            type: 'sync_response',
                            from: peerId,
                            messages: msg.messages
                        }));
                    }
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    if (peerId && peers.has(peerId)) {
                        peers.get(peerId).lastSeen = Date.now();
                    }
                    break;
            }
        } catch (e) {
            console.error('❌ Error procesando mensaje:', e.message);
        }
    });

    ws.on('close', () => {
        if (peerId) {
            peers.delete(peerId);
            console.log(`👋 Peer desconectado: ${peerId.substring(0, 8)}... (${peers.size} restantes)`);

            // Notificar a otros
            broadcast(null, {
                type: 'peer_left',
                peerId: peerId
            });
        }
    });

    ws.on('error', (err) => {
        console.error('❌ Error WebSocket:', err.message);
    });
});

function broadcast(excludePeerId, message) {
    const msgStr = JSON.stringify(message);
    peers.forEach((peer, id) => {
        if (id !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(msgStr);
        }
    });
}

// Limpiar peers inactivos y mensajes viejos cada minuto
setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutos sin ping = desconectado

    peers.forEach((peer, id) => {
        if (now - peer.lastSeen > timeout) {
            peer.ws.close();
            peers.delete(id);
            console.log(`🧹 Peer eliminado por inactividad: ${id.substring(0, 8)}...`);
        }
    });

    // Limpiar mensajes pendientes viejos
    pendingMessages.forEach((messages, peerId) => {
        const filtered = messages.filter(m => now - m.timestamp < MESSAGE_TTL);
        if (filtered.length === 0) {
            pendingMessages.delete(peerId);
        } else if (filtered.length !== messages.length) {
            pendingMessages.set(peerId, filtered);
        }
    });
}, 60000);

// Estadísticas cada 5 minutos
setInterval(() => {
    console.log(`📊 Stats: ${peers.size} peers conectados, ${pendingMessages.size} con mensajes pendientes`);
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    wss.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});
