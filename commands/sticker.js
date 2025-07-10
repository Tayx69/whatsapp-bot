const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");
const { randomUUID } = require("crypto");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = async (sock, msg) => {
  const isImage = msg.message?.imageMessage;
  const isVideo = msg.message?.videoMessage;

  if (!isImage && !isVideo) {
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ Kirim gambar/video dengan caption *.sticker*.",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key },
  });

  try {
    const mediaBuffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    const tempFile = path.join(
      tmpdir(),
      `${randomUUID()}.${isImage ? "jpg" : "mp4"}`
    );
    fs.writeFileSync(tempFile, mediaBuffer);

    let stickerBuffer;

    if (isVideo) {
      const trimmedPath = tempFile.replace(".mp4", "_trimmed.mp4");

      await new Promise((resolve, reject) => {
        ffmpeg(tempFile)
          .setStartTime(0)
          .duration(6)
          .output(trimmedPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      stickerBuffer = await new Sticker(trimmedPath, {
        type: StickerTypes.FULL,
        pack: "TayHelper",
        author: "Tayoo",
      }).toBuffer();

      fs.unlinkSync(trimmedPath);
    } else {
      stickerBuffer = await new Sticker(tempFile, {
        type: StickerTypes.FULL,
        pack: "TayooBot",
        author: "Sticker Maker",
      }).toBuffer();
    }

    fs.unlinkSync(tempFile);

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        sticker: stickerBuffer,
      },
      { quoted: msg }
    );

    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key },
    });
  } catch (err) {
    console.error("❌ Sticker Error:", err);
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Gagal membuat stiker.",
      },
      { quoted: msg }
    );
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });
  }
};
