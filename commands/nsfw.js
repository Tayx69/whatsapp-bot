const axios = require("axios");
const cheerio = require("cheerio");

function acakArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\W_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function scrapePage(page = 1) {
  const url = `https://sfmcompile.club/page/${page}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const hasil = [];

  $("#primary > div > div > ul > li > article").each((i, el) => {
    hasil.push({
      title: $(el).find("header > h2").text(),
      link: $(el).find("header > h2 > a").attr("href"),
      category: $(el)
        .find("header > div.entry-before-title > span > span")
        .text()
        .replace("in ", ""),
      share_count: $(el)
        .find("header > div.entry-after-title > p > span.entry-shares")
        .text(),
      views_count: $(el)
        .find("header > div.entry-after-title > p > span.entry-views")
        .text(),
      type: $(el).find("source").attr("type") || "image/jpeg",
      media:
        $(el).find("source").attr("src") || $(el).find("img").attr("data-src"),
    });
  });

  return hasil;
}

module.exports = async (sock, msg, args) => {
  const query = args.join(" ").toLowerCase();
  const searchMode = query.length > 0;

  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "🔍", key: msg.key },
  });

  try {
    let konten = [];

    if (searchMode) {
      for (let i = 1; i <= 10; i++) {
        const pageData = await scrapePage(i);
        const filtered = pageData.filter((x) =>
          normalize(x.title).includes(normalize(query))
        );
        konten.push(...filtered);
        if (konten.length >= 5) break;
      }

      if (konten.length === 0) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: `❌ Tidak ditemukan hasil untuk: *${query}*`,
          },
          { quoted: msg }
        );
      }
    } else {
      const randomPage = Math.floor(Math.random() * 1153);
      konten = await scrapePage(randomPage);
    }

    konten = acakArray(konten);
    const item = konten[0];

    const caption = `🔞 *${item.title}*\n📁 Kategori: ${item.category}\n👀 ${item.views_count} | 🔁 ${item.share_count}\n🌐 ${item.link}`;

    if (item.type.includes("video")) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { video: { url: item.media }, caption },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        msg.key.remoteJid,
        { image: { url: item.media }, caption },
        { quoted: msg }
      );
    }

    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key },
    });
  } catch (err) {
    console.error("❌ hentai error:", err.message);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "⚠️ Gagal mengambil konten." },
      { quoted: msg }
    );
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });
  }
};
