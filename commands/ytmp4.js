const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

module.exports = async (sock, msg, args) => {
  const url = args[0];

  if (!url || !/(youtube\.com|youtu\.be)/.test(url)) {
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ Masukkan link YouTube yang valid\nContoh: *.ytmp4 https://youtu.be/abc123*",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key },
  });

  const filename = `${randomUUID()}.mp4`;
  const filepath = path.join(__dirname, "../temp", filename);

  try {
    await new Promise((resolve, reject) => {
      exec(`yt-dlp -f mp4 -o "${filepath}" "${url}"`, (err, stdout, stderr) => {
        if (err) return reject(stderr);
        resolve();
      });
    });

    if (!fs.existsSync(filepath)) {
      throw new Error("File tidak ditemukan setelah di-download.");
    }

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        video: fs.readFileSync(filepath),
        mimetype: "video/mp4",
        caption: `✅ Berhasil mengambil video dari:\n${url}`,
      },
      { quoted: msg }
    );

    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key },
    });

    fs.unlinkSync(filepath); // Hapus file sementara di temp/
  } catch (err) {
    console.error("❌ YTMP4 Error:", err);
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Gagal mengambil video. Mungkin dibatasi oleh YouTube.",
      },
      { quoted: msg }
    );
  }
};
