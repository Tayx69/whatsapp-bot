require("dotenv").config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

// Ambil semua command dari folder commands/
const commands = {};
const commandFiles = fs.readdirSync(path.join(__dirname, "commands"));
for (const file of commandFiles) {
  const name = path.basename(file, ".js");
  commands["." + name] = require(`./commands/${file}`);
}
// End Ambil Command

// Login WhatsApp dengan QR
async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📲 Scan QR ini pakai WhatsApp kamu:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ Bot sudah terhubung ke WhatsApp!");
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Terlogout dari WhatsApp.");
      } else {
        console.log("🔁 Menghubungkan ulang...");
        connectBot();
      }
    }
  });
  // End Login QR

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message || msg.key.fromMe) return;

    let text = "";

    if (msg.message.conversation) {
      text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage?.caption) {
      text = msg.message.imageMessage.caption;
    } else if (msg.message.videoMessage?.caption) {
      text = msg.message.videoMessage.caption;
    }

    if (!text) return;

    const command = text.trim().split(" ")[0].toLowerCase();
    const args = text.trim().split(" ").slice(1);

    if (commands[command]) {
      try {
        await commands[command](sock, msg, args);
      } catch (err) {
        console.error("❌ Error saat menjalankan perintah:", err);
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: "⚠️ Terjadi kesalahan." },
          { quoted: msg }
        );
      }
    } else if (text.startsWith(".")) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ Perintah tidak dikenal." },
        { quoted: msg }
      );
    }
  });
}

connectBot();
