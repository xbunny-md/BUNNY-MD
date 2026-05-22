const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

module.exports = (io, startMainEngine, state) => {
  const activeSessions = new Map();

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    let tempSock = null;

    socket.on("requestPairing", async ({ phoneNumber, method }) => {
      const cleanNumber = phoneNumber?.replace(/[^0-9]/g, "");

      if (method === "pairingCode" && !cleanNumber) {
        return socket.emit("error", { message: "Phone number required for pairing code" });
      }

      if (activeSessions.has(socket.id)) {
        return socket.emit("error", { message: "Session already active. Refresh page" });
      }

      try {
        const sessionId = `pair_${socket.id}_${Date.now()}`;
        const sessionPath = path.join(__dirname, "..", "session", sessionId);

        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        tempSock = makeWASocket({
          version,
          auth: authState,
          logger: pino({ level: "silent" }),
          browser: [state.botName, "Chrome", "20.0.0"],
          printQRInTerminal: false
        });

        activeSessions.set(socket.id, { sock: tempSock, path: sessionPath });

        if (method === "pairingCode" && cleanNumber) {
          setTimeout(async () => {
            try {
              if (!tempSock.authState.creds.registered) {
                const code = await tempSock.requestPairingCode(cleanNumber);
                const formatted = code.match(/.{1,4}/g).join("-");
                socket.emit("pairingCodeResponse", { code: formatted });
              }
            } catch (err) {
              socket.emit("error", { message: "Failed to get pairing code" });
            }
          }, 2000);
        }

        tempSock.ev.on("creds.update", saveCreds);

        tempSock.ev.on("connection.update", async (update) => {
          const { connection, qr } = update;

          if (qr && method === "qr") {
            try {
              const qrImage = await QRCode.toDataURL(qr);
              socket.emit("qr", qrImage);
              socket.emit("qrCodeResponse", { qr: qrImage });
            } catch (e) {
              console.error("QR error:", e.message);
            }
          }

          if (connection === "open") {
            const number = tempSock.user.id.split(":")[0];
            console.log(`[Pairing] Connected: ${number}`);

            // Move creds to main session folder
            const mainSessionPath = path.join(__dirname, "..", "session");
            fs.rmSync(mainSessionPath, { recursive: true, force: true });
            fs.renameSync(sessionPath, mainSessionPath);

            tempSock.ev.removeAllListeners();
            tempSock.end();
            activeSessions.delete(socket.id);

            socket.emit("connected");
            socket.emit("pairingSuccess", { number });

            // Start main engine
            await startMainEngine();
          }

          if (connection === "close") {
            cleanup(socket.id);
          }
        });

      } catch (err) {
        console.error("Pairing error:", err.message);
        socket.emit("error", { message: "Internal error during pairing" });
        cleanup(socket.id);
      }
    });

    socket.on("disconnect", () => {
      cleanup(socket.id);
    });

    function cleanup(id) {
      const session = activeSessions.get(id);
      if (session) {
        try {
          session.sock?.ev.removeAllListeners();
          session.sock?.end();
          fs.rmSync(session.path, { recursive: true, force: true });
        } catch (_) {}
        activeSessions.delete(id);
      }
    }
  });
};