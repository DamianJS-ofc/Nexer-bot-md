import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => {
  try { return fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE,'utf8')) : {}; } catch { return {}; }
};
const saveEconomy = (db) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(db,null,2));
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

function getRealPhoneNumber(usersDB, jid) {
  if (!jid ||!usersDB) return null;
  const id = jid.split('@')[0];
  for (const [num, u] of Object.entries(usersDB)) {
    if (u.lid === jid || u.lid === id) return num;
    if (u.jid === jid || u.jid === id) return num;
  }
  if (/^\d+$/.test(id) && id.length > 7) return id;
  return null;
}

export default {
  name: 'clear',
  alias: ['cleareco'],
  category: 'Owner',

  async execute(sock, msg, options) {
    const { config, usersDB, senderNumber, replyWithContext, senderJid, isOwner, args } = options;
    const from = msg.key.remoteJid;

    if (!isOwner) {
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Solo owner`, [senderJid]);
    }

    let targetNumber = null;
    let targetMentionJid = null;

    if (args[0] && /^\d+$/.test(args[0])) {
      targetNumber = args[0];
      targetMentionJid = `${targetNumber}@s.whatsapp.net`;
    } else {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const jid = mentioned || quoted;
      if (jid) {
        targetNumber = getRealPhoneNumber(usersDB, jid) || jid.split('@')[0];
        targetMentionJid = jid.includes('@')? jid : `${jid}@s.whatsapp.net`;
      }
    }

    if (!targetNumber) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Menciona, responde o pon número\n> Ej: \`${config.prefix}clear @user\` o \`${config.prefix}clear 521999...`, [senderJid]);
    }

    const economy = loadEconomy();
    if (!economy[targetNumber]) {
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Usuario no tiene economía`, [senderJid]);
    }

    economy[targetNumber].coins = 0;
    saveEconomy(economy);

    await react(sock, msg, '🧹');
    return replyWithContext(`🧹 @${targetNumber} ahora tiene *0 coins*`, [targetMentionJid]);
  }
};