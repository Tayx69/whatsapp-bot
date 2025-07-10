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

    if (!data || (!data.play && !data.hdplay)) {
      await sock.sendMessage(msg.key.remoteJid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      return await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Gagal mengambil video dari link tersebut.",
        },
        { quoted: msg }
      );
    }

    const videoUrl = data.hdplay
      ? "https://www.tikwm.com" + data.hdplay
      : "https://www.tikwm.com" + data.play;
    const rawTitle = data.title?.trim() || "Tanpa judul";
    const title = cleanTitle(rawTitle) || "Tanpa judul";

    const author = data.author.nickname;
    const duration = data.duration + "s";
    const uploaded = formatDate(data.create_time);
    const views = formatNumber(data.play_count);
    const likes = formatNumber(data.digg_count);
    const comments = formatNumber(data.comment_count);
    const shares = formatNumber(data.share_count);

    const caption = `🎬 *${title}*\n👤 ${author}\n\n🕒 Durasi: ${duration}\n📅 Diunggah: ${uploaded}\n📊 ${views} Views | 🩷 ${likes} Likes\n💬 ${comments} Komentar | 🔁 ${shares} Dibagikan\n\n🔗 ${url}`;

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        video: { url: videoUrl },
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
    console.error("❌ Error TikTok:", err.message);

    await sock.sendMessage(msg.key.remoteJid, {
      react: {
        text: "❌",
        key: msg.key,
      },
    });

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Terjadi kesalahan saat mengambil video.",
      },
      { quoted: msg }
    );
  }
};
