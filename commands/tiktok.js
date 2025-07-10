const axios = require("axios");

function formatNumber(num) {
  return Number(num).toLocaleString("id-ID");
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return (
    date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) +
    " pukul " +
    date.toLocaleTimeString("id-ID")
  );
}

function cleanTitle(text) {
  return text
    .replace(/#[^\s#@]+/g, "")
    .replace(/@[^\s#@]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidTiktokUrl(url) {
  return /^(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/.+$/.test(
    url
  );
}

module.exports = async (sock, msg, args) => {
  const url = args[0];

  if (!url || !isValidTiktokUrl(url)) {
    return await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ Masukkan URL TikTok yang valid.\n\nContoh:\n.tiktok *https://vt.tiktok.com/abc123/*",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(msg.key.remoteJid, {
    react: {
      text: "⏳",
      key: msg.key,
    },
  });

  try {
    const res = await axios.post(
      "https://www.tikwm.com/api/",
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
          Referer: "https://www.tikwm.com/",
        },
        params: {
          url: url,
          count: 12,
          cursor: 0,
          web: 1,
          hd: 1,
        },
      }
    );

    const data = res.data.data;

    if (!data || !data.music) {
      await sock.sendMessage(msg.key.remoteJid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      return await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Gagal mengambil audio dari link tersebut.",
        },
        { quoted: msg }
      );
    }

    const audioUrl = "https://www.tikwm.com" + data.music;
    const rawTitle = data.title?.trim() || "Audio TikTok";
    const title = cleanTitle(rawTitle) || "Audio TikTok";
    const author = data.author.nickname;
    const uploaded = formatDate(data.create_time);

    const caption = `🎧 *${title}*\n👤 ${author}\n📅 Diunggah: ${uploaded}\n\n🔗 ${url}`;

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mp4",
        ptt: false, // false = Audio , True = VN (VoiceNote)
        fileName: `${title}.mp3`,
        caption: caption,
      },
      { quoted: msg }
    );

    await sock.sendMessage(msg.key.remoteJid, {
      react: {
        text: "✅",
        key: msg.key,
      },
    });
  } catch (err) {
    console.error("❌ Error:", err.message);

    await sock.sendMessage(msg.key.remoteJid, {
      react: {
        text: "❌",
        key: msg.key,
      },
    });

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Terjadi kesalahan saat mengambil audio.",
      },
      { quoted: msg }
    );
  }
};
