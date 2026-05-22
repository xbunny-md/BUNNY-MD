import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState 
} from '@whiskeysockets/baileys';
import pino from 'pino';

/**
 * Binds the WebSocket Routing Engine to the main Express HTTP Server
 * Handles secure connection handshakes, pairing requests, auto-updating QR codes, and database persistence
 * Fully optimized for Baileys v7 natively without relying on internal @hapi/boom imports
 */
export function bindSocketRoutingEngine(io, startBotInstance, SERVER_ID, MAX_BOT_CONNECTIONS, supabase) {

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

            const sessionIdentifier = cleanNumber || `qr_session_${socket.id}`;
            const botId = cleanNumber ? `${cleanNumber}:0` : null;

            try {
                // 1. Structural Check: Ensure server capacity limit hasn't been crossed
                const { data: activeSlots, error: countError } = await supabase
                    .from('bot_accounts')
                    .select('bot_id')
                    .eq('server_id', SERVER_ID)
                    .eq('status', 'active');

                if (countError) throw countError;

                if (activeSlots && activeSlots.length >= MAX_BOT_CONNECTIONS) {
                    return socket.emit('error', { 
                        message: `Server capacity reached! Maximum limit is ${MAX_BOT_CONNECTIONS} instances on this node. Please utilize another server link.` 
                    });
                }

                // If a connection already exists for this socket session, clean it up before opening a new one
                if (currentSock) {
                    try { currentSock.logout(); } catch (_) {}
                }

                console.log(`[Socket Engine] Initializing WhatsApp instance via [${method}] for session: ${sessionIdentifier}`);

                // 2. Setup temporary volatile auth configuration state for registration phase
                const { state, saveCreds } = await useMultiFileAuthState(`temp_session_${sessionIdentifier}`);

                currentSock = makeWASocket({
                    auth: state,
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
                currentSock.ev.on('creds.update', saveCreds);

                currentSock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;

                    // Intercept and pipe auto-updating QR Code strings directly to front-end rendering logic
                    if (qr && method === 'qr') {
                        console.log(`[Socket Engine] Auto-updating QR Code broadcated for: ${socket.id}`);
                        socket.emit('qrCodeResponse', { qr });
                    }

                    if (connection === 'open') {
                        const finalBotId = botId || `${currentSock.user.id.split(':')[0]}:0`;
                        const authenticatedNumber = finalBotId.split(':')[0];

                        console.log(`[Handshake Success] ${authenticatedNumber} safely authenticated! Transferring profile payload...`);

                        // Register structural parameters inside main infrastructure tables
                        await supabase
                            .from('bot_accounts')
                            .upsert({ 
                                server_id: SERVER_ID, 
                                bot_id: finalBotId, 
                                status: 'active' 
                            });

                        // Export in-memory creds straight into cloud tables
                        await supabase
                            .from('bot_sessions')
                            .upsert({
                                server_id: SERVER_ID,
                                bot_id: finalBotId,
                                session_key: 'creds',
                                session_data: state.creds
                            });

                        // Broadcast success event confirmation back to UI layers
                        socket.emit('pairingSuccess', { 
                            message: 'Bunny MD connected successfully! Check your WhatsApp chat for initialization reports.' 
                        });

                        // Kill local registration listeners and pass execution tasks over to main index process cluster loop
                        currentSock.ev.removeAllListeners('connection.update');
                        currentSock = null;
                        await startBotInstance(finalBotId, true);
                    }

                    if (connection === 'close') {
                        // Native Baileys v7 error payload routing replacing the deprecated @hapi/boom extractor dependency
                        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
                        console.log(`[Socket Engine Connection] Registration lifecycle closed. Reason code: ${reason}`);

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

        socket.on('disconnect', () => {
            console.log(`[Socket Session] Client socket pipeline disconnected: ${socket.id}`);
            if (currentSock) {
                try { currentSock.logout(); } catch (_) {}
                currentSock = null;
            }
        });
    });
}
