const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});
export default {
  name: 'botinfo', alias: ['infobot','info'], category: 'Info',
  async execute(sock, msg, options) {
    const { config, senderNumber, senderJid } = options;
    const h = Math.floor(process.uptime()/3600); const m = Math.floor((process.uptime()%3600)/60);
    const text = `*${config.name} • INFO*\n> Prefijo: ${config.prefix}\n> Version: ${config.version}\n> Uptime: ${h}h ${m}m\n> Node: ${process.version}`;
    await react(sock, msg, 'ℹ️');
    await sock.sendMessage(msg.key.remoteJid, { text, mentions: [senderJid] }, { quoted: msg });
    await react(sock, msg, '✅');
  }
};
