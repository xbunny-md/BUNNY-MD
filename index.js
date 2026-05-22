require("dotenv").config();
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const StateManager = require("./core/state");
const { loadCommands, loadObservers } = require("./core/loader");
const { routeMessage } = require("./core/router");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) => res.redirect("/pair"));
app.get("/pair", (_, res) => res.sendFile(path.join(__dirname, "public", "pair.html")));

// Global state
const state = new StateManager();
let sock = null;
let isStarting = false;

// Load commands and observers once
let commands = new Map();
let observers = [];
let aliases = new Map();

async function startEngine() {
  if (isStarting || state.isConnected) return;
  isStarting = true;

  try {
    await state.loadSettings();
    commands = loadCommands();
    observers = loadObservers();
    aliases = buildAliases(commands);

    const { state: authState, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: authState,
      browser: [state.botName, "Chrome", "20.0.0"],
      markOnlineOnConnect: false,
      printQRInTerminal: false
    });

    // Message handler
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const m = messages[0];
      if (!m?.message) return;

      await routeMessage(m, sock, { commands, aliases, observers, state });
    });

    // Connection handler
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        io.emit("qr", qr);
        io.emit("qrCodeResponse", { qr });
      }

      if (connection === "close") {
        state.isConnected = false;
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log(`[Connection Closed] Reason: ${reason}`);

        if (reason!== DisconnectReason.loggedOut) {
          setTimeout(() => startEngine(), 5000);
        } else {
          console.log("Logged out. Delete./session and re-pair.");
        }
        isStarting = false;
      }

      if (connection === "open") {
        state.isConnected = true;
        isStarting = false;
        console.log(`✅ ${state.botName} Connected`);

        io.emit("connected");
        io.emit("pairingSuccess");

        // Send onboarding once
        if (!state.onboardingSent) {
          state.onboardingSent = true;
          await sendOnboarding(sock);
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

  } catch (err) {
    console.error("Engine start error:", err);
    isStarting = false;
    setTimeout(() => startEngine(), 5000);
  }
}

function buildAliases(commands) {
  const aliasMap = new Map();
  for (const [name, cmd] of commands) {
    if (cmd.config?.alias && Array.isArray(cmd.config.alias)) {
      for (const a of cmd.config.alias) {
        aliasMap.set(a, name);
      }
    }
  }
  return aliasMap;
}

async function sendOnboarding(sock) {
  try {
    const userNum = sock.user.id.split(":")[0];
    const msg =
`╭─⌈ *${state.botName}* ⌋
│
│ Hello ${sock.user.name || "User"}, bot is online.
│ Prefix: ${state.prefix}
│ Owner: ${state.ownerName}
│
╰⊷ Type ${state.prefix}menu to start`;

    await sock.sendMessage(`${userNum}@s.whatsapp.net`, { text: msg });
  } catch (e) {
    console.error("Onboarding error:", e.message);
  }
}

// Bind pairing socket
require("./socket/pairing")(io, startEngine, state);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startEngine();
});

// Crash protection
process.on("uncaughtException", err => console.error("Uncaught:", err));
process.on("unhandledRejection", err => console.error("Unhandled:", err));