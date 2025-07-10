const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (sock, msg, args) => {
  const query = args.join(" ").toLowerCase();
  if (!query) {
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "❌ Masukkan nama wilayah.\nContoh: *.cuaca Surabaya*",
      },
      { quoted: msg }
    );
  }

  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "🌦️", key: msg.key },
  });

  try {
    const res = await axios.get(
      "https://www.bmkg.go.id/cuaca/prakiraan-cuaca-indonesia.bmkg"
    );
    const $ = cheerio.load(res.data);

    const hasilList = [];
    const semuaKota = [];

    $("table.table-prakiraan tbody tr").each((i, el) => {
      const kota = $(el).find("td:nth-child(1)").text().trim();
      if (!kota) return;

      const kotaLower = kota.toLowerCase();
      semuaKota.push(kota);

      if (kotaLower.includes(query)) {
        const cuaca = $(el).find("td:nth-child(2)").text().trim();
        const suhu = $(el).find("td:nth-child(3)").text().trim();
        const kelembapan = $(el).find("td:nth-child(4)").text().trim();

        hasilList.push(
          `🌆 *${kota}*\n🌥️ Cuaca: ${cuaca}\n🌡️ Suhu: ${suhu}\n💧 Kelembapan: ${kelembapan}`
        );
      }
    });

    if (hasilList.length > 0) {
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: hasilList.join("\n\n"),
        },
        { quoted: msg }
      );
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "✅", key: msg.key },
      });
    } else {
      // Rekomendasi wilayah
      const rekomendasi =
        semuaKota
          .filter((k) => k.toLowerCase().includes(query))
          .slice(0, 5)
          .join(", ") || "Tidak ada saran wilayah.";

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Wilayah *${query}* tidak ditemukan.\n\n🔍 Coba cari: ${rekomendasi}`,
        },
        { quoted: msg }
      );
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "❌", key: msg.key },
      });
    }
  } catch (err) {
    console.error("❌ Cuaca Error:", err.message);
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "⚠️ Gagal mengambil data cuaca.",
      },
      { quoted: msg }
    );
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });
  }
};
