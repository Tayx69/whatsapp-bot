const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = async (sock, msg, args) => {
  const url = args[0];

  if (!url || !/(youtube\.com|youtu\.be)/.test(url)) {
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ Masukkan link YouTube yang valid\nContoh: *.ytmp3 https://youtu.be/abc123*",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key },
  });

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const filename = `${randomUUID()}.mp3`;
    const filepath = path.join(__dirname, "../temp", filename);

    await new Promise((resolve, reject) => {
      ffmpeg(ytdl(url, { quality: "highestaudio" }))
        .audioBitrate(128)
        .format("mp3")
        .save(filepath)
        .on("end", resolve)
        .on("error", reject);
    });

    const buffer = fs.readFileSync(filepath);

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        document: buffer,
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        caption: `🎵 *${title}*\n🔗 ${url}`,
      },
      { quoted: msg }
    );

    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key },
    });

    fs.unlinkSync(filepath); // Hapus file sementara di temp/
  } catch (err) {
    console.error("❌ YTMP3 Error:", err.message);

    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Gagal mengambil MP3 dari link tersebut.",
      },
      { quoted: msg }
    );
  }
};
