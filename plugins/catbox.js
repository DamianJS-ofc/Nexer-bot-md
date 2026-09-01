import fetch from 'node-fetch';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'catbox',
  alias: ['cb'],
  category: 'Descargas',

  async execute(sock, msg, options) {
    const { args, config, replyWithContext, senderJid } = options;
    const from = msg.key.remoteJid;
    const url = args[0]?.trim();

    if (!url ||!url.includes('catbox.moe')) {
      await react(sock, msg, '❓');
      return replyWithContext(`⭐ Pon un link válido de catbox\n> Ej: \`${config.prefix}catbox https://files.catbox.moe/xxxxx.mp4\``, [senderJid]);
    }

    try {
      await react(sock, msg, '⏳');

      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || '';
      const isVideo = contentType.includes('video') || url.toLowerCase().match(/\.(mp4|mov|mkv|webm)$/);

      await sock.sendMessage(from, isVideo? { video: buffer, mimetype: 'video/mp4' } : { image: buffer }, { quoted: msg });
      await react(sock, msg, '✅');

    } catch (e) {
      console.error('catbox:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No pude descargar\n> ${e.message}`, [senderJid]);
    }
  }
};