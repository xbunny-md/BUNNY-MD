import makeWASocket, { 
    DisconnectReason, 
    initAuthCreds,
    BufferJSON
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

/**
 * Binds the WebSocket Routing Engine to the main Express HTTP Server
 * Handles secure connection handshakes, pairing requests, and auto-updating QR codes
 * Fully isolated to operate 100% in local volatile memory (In-Memory Architecture)
 * ZERO database connections utilized for maximum execution speed and standalone deployment
 */
export function bindSocketRoutingEngine(io, startBotInstance, SERVER_ID, MAX_BOT_CONNECTIONS) {

    io.on('connection', (socket) => {
        console.log(`[Socket Session] New frontend client linked: ${socket.id}`);

        // Track active connection process for this specific socket session to prevent leaks
        let currentSock = null;

        /**
         * Triggered when a user requests initialization (either QR or Pairing Code) from pair.html
         */
        socket.on('requestPairing', async (payload) => {
            const { phoneNumber, method } = payload; // method can be 'qr' or 'pairingCode'

            // Clean phone number format if provided
            const cleanNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : null;

            if (method === 'pairingCode' && !cleanNumber) {
                return socket.emit('error', { message: 'A valid WhatsApp phone number is strictly required for pairing code authentication.' });
            }

            const botId = cleanNumber ? `${cleanNumber}:0` : null;

            try {
                // Safely clear old socket instance before opening a new stream pipeline
                if (currentSock) {
                    try { 
                        currentSock.ev.removeAllListeners('connection.update');
                        currentSock.end(); 
                    } catch (_) {}
                }

                console.log(`[Socket Engine] Initializing WhatsApp instance via [${method}] for Standalone Node session`);

                // 2. Pure In-Memory Authentication Mappings (Completely independent)
                const pristineCreds = initAuthCreds();
                const ephemeralAuthState = {
                    creds: pristineCreds,
                    keys: {
                        get: (type, ids) => {
                            const data = {};
                            for (const id of ids) {
                                data[id] = pristineCreds[type]?.[id];
                            }
                            return data;
                        },
                        set: (data) => {
                            for (const type in data) {
                                for (const id in data[type]) {
                                    if (!pristineCreds[type]) pristineCreds[type] = {};
                                    if (data[type][id] === null) {
                                        delete pristineCreds[type][id];
                                    } else {
                                        pristineCreds[type][id] = data[type][id];
                                    }
                                }
                            }
                        }
                    }
                };

                // Initialize core parameters utilizing fully hardened browser identity string masks
                currentSock = makeWASocket({
                    auth: ephemeralAuthState,
                    printQRInTerminal: false,
                    logger: pino({ level: 'silent' }),
                    browser: ['Ubuntu', 'Chrome', '20.0.04']
                });

                // 3. Request pairing sequence if explicitly specified by user layout choice
                if (method === 'pairingCode' && cleanNumber) {
                    setTimeout(async () => {
                        try {
                            const pairingCode = await currentSock.requestPairingCode(cleanNumber);
                            socket.emit('pairingCodeResponse', { code: pairingCode });
                        } catch (pairingReqError) {
                            console.error('[Socket Engine Error] WhatsApp pairing request rejected:', pairingReqError.message);
                            socket.emit('error', { message: 'Failed to fetch pairing code from WhatsApp servers. Try again.' });
                        }
                    }, 3000);
                }

                // 4. Actively track handshake process changes and intercept confirmation/QR events
                currentSock.ev.on('creds.update', () => {
                    // Ephemeral memory engine automatically tracks changes inline during state propagation
                });

                currentSock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;

                    // Converts raw QR string to Base64 DataURL image string before broadcasting to frontend UI
                    if (qr && method === 'qr') {
                        try {
                            console.log(`[Socket Engine] Generating QR Image Matrix for client: ${socket.id}`);
                            const qrImageUrl = await QRCode.toDataURL(qr);
                            socket.emit('qrCodeResponse', { qr: qrImageUrl });
                        } catch (qrGenErr) {
                            console.error('[QR Engine Error] Failed to compile matrix to base64 image:', qrGenErr.message);
                        }
                    }

                    if (connection === 'open') {
                        const finalBotId = botId || `${currentSock.user.id.split(':')[0]}:0`;
                        const authenticatedNumber = finalBotId.split(':')[0];

                        console.log(`[Handshake Success] ${authenticatedNumber} safely authenticated 100% in memory!`);

                        // COMPACT BASE64 BLOCK SYNC - Ready to be passed to runtime memory state
                        const cloudPackData = JSON.stringify(ephemeralAuthState.creds, BufferJSON.replacer);

                        // Broadcast success event confirmation back to UI layers
                        socket.emit('pairingSuccess', { 
                            message: 'Bunny MD connected successfully! Check your WhatsApp chat for initialization reports.',
                            sessionCreds: cloudPackData // Sent back to frontend if needed, or injected locally
                        });

                        // Kill local registration listeners and pass execution tasks over to main index process cluster loop
                        currentSock.ev.removeAllListeners('connection.update');
                        currentSock = null;
                        
                        // Pass to index.js memory loop directly with credentials included
                        await startBotInstance(finalBotId, true, ephemeralAuthState.creds);
                    }

                    if (connection === 'close') {
                        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
                        console.log(`[Socket Engine Connection] Registration lifecycle closed. Reason code: ${reason}`);

                        // Safe hot-restart mitigation layer preserving internal state flow
                        if (reason === 515 || reason === DisconnectReason.restartRequired) {
                            console.log(`[Socket Engine Balance] Internal hot-restart signaled by WhatsApp network. Keeping stream pipeline warm.`);
                            return; 
                        }

                        if (reason === DisconnectReason.loggedOut) {
                            socket.emit('error', { message: 'Device pairing initialization was rejected or logged out.' });
                        }
                    }
                });

            } catch (fatalSocketErr) {
                console.error('[Socket Engine Fatal] Registration handler crashed:', fatalSocketErr.message);
                socket.emit('error', { message: 'Internal infrastructure error occurred during device handshake execution.' });
            }
        });

        // Fixed frontend disconnect logic to avoid blowing up active handshake registration flows
        socket.on('disconnect', () => {
            console.log(`[Socket Session] Client socket pipeline disconnected: ${socket.id}`);
            if (currentSock) {
                currentSock.ev.removeAllListeners('connection.update');
                currentSock = null;
            }
        });
    });
                        }
            
