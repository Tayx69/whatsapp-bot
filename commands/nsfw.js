const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const dbPath = path.join(__dirname, "../log/nsfw-log.json");

// Buat folder & file log jika belum ada
if (!fs.existsSync(path.join(__dirname, "../log"))) {
  fs.mkdirSync(path.join(__dirname, "../log"));
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "[]", "utf-8");
}

function acakArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
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
    const log = JSON.parse(fs.readFileSync(dbPath));

    let page = 1;
    while (page <= 1153 && konten.length < 10) {
      const pageData = await scrapePage(page);
      const filtered = searchMode
        ? pageData.filter(
            (x) =>
              normalize(x.title).includes(normalize(query)) &&
              !log.includes(x.link)
          )
        : pageData.filter((x) => !log.includes(x.link));
      konten.push(...filtered);
      if (konten.length > 0) break;
      page++;
    }

    if (konten.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "❌", key: msg.key },
      });

      return await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Tidak ditemukan hasil baru untuk: *${query}*`,
        },
        {
          quoted: msg,
        }
      );
    }

    konten = acakArray(konten);
    const item = konten[0];
    log.push(item.link);
    fs.writeFileSync(dbPath, JSON.stringify(log, null, 2));

    const caption = `📁 Kategori: ${item.category}\n👀 ${item.views_count} | 🔁 ${item.share_count}`;

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
    console.error("❌ NSFW error:", err.message);
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

// Reset log otomatis tiap minggu
cron.schedule("0 2 * * 0", () => {
  fs.writeFileSync(dbPath, "[]", "utf-8");
});
