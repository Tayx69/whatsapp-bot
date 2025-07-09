const fs = require("fs");
const path = require("path");

module.exports = async (sock, msg) => {
  const namaPengirim = msg.pushName || "Pengguna";

  const teks =
    `👋 Hai, *${namaPengirim}!*` +
    `\nSaya adalah *${process.env.BOT_NAME || "Bot"}*. Siap membantu kamu! ✅` +
    `\n\nKetik *.menu* untuk melihat daftar fitur.`;

  const imageBuffer = fs.readFileSync(
    path.join(__dirname, "../media/welcome.jpg")
  );

  await sock.sendMessage(
    msg.key.remoteJid,
    {
      image: imageBuffer,
      caption: teks,
    },
    { quoted: msg }
  );
};
