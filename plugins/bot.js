import { getGroupConfig, updateGroupConfig } from '../lib/groupConfig.js';
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});
export default {
  name: 'bot', category: 'Grupos',
  async execute(sock, msg, options) {
    const { senderJid, args, replyWithContext, isOwner } = options;
    const from = msg.key.remoteJid;
    if (!from.endsWith('@g.us')) { await react(sock, msg, '📛'); return replyWithContext(`Solo grupos`, [senderJid]); }
    const action = args[0]?.toLowerCase();
    if (!['on','off'].includes(action)) { await react(sock, msg, '❓'); return replyWithContext(`Uso: bot on/off`, [senderJid]); }
    updateGroupConfig(from, { botEnabled: action==='on' });
    await react(sock, msg, action==='on'?'✅':'🔴'); return replyWithContext(`Bot ${action==='on'?'activado':'desactivado'}`, [senderJid]);
  }
};