import { search, download } from 'aptoide-scraper';
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});
export default {
  name: 'apk', alias: ['aptoide','apkdl'], category: 'Descargas',
  async execute(sock, msg, options) {
    const { config, args, senderJid, replyWithContext } = options;
    const query = args.join(' ').trim();
    if (!query) { await react(sock, msg, '❓'); return replyWithContext(`✳️ Pon nombre de app`, [senderJid]); }
    try {
      await react(sock, msg, '🔍');
      const results = await search(query); if (!results?.length) { await react(sock, msg, '❌'); return replyWithContext(`No encontrado`, [senderJid]); }
      const apk = await download(results[0].id); await react(sock, msg, '📥');
      await sock.sendMessage(msg.key.remoteJid, { document: { url: apk.dllink }, mimetype: 'application/vnd.android.package-archive', fileName: `${apk.name}.apk`, caption: `*${apk.name}* • ${apk.size}` }, { quoted: msg });
      await react(sock, msg, '✅');
    } catch { await react(sock, msg, '❌'); }
  }
};