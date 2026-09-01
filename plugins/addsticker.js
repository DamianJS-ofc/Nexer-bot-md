import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from 'infinity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');

const loadPacksDB = () => {
  try { return fs.existsSync(PACKS_FILE)? JSON.parse(fs.readFileSync(PACKS_FILE,'utf8')) : {}; } catch { return {}; }
};
const savePacksDB = (db) => {
  try { fs.mkdirSync(path.dirname(PACKS_FILE),{recursive:true}); fs.writeFileSync(PACKS_FILE, JSON.stringify(db,null,2)); return true; } catch { return false; }
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'addsticker',
  alias: ['stickeradd'],
  category: 'Stickers',

  async execute(sock, msg, options) {
    const { config, senderNumber, senderJid, args, replyWithContext } = options;
    const from = msg.key.remoteJid;
    const packName = args.join(' ').trim();

    if (!packName) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Debes poner el nombre del pack\n> Ej: \`${config.prefix}addsticker Mis Stickers\` _(responde a un sticker)_`, [senderJid]);
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage?.stickerMessage) {
      await react(sock, msg, '❌');
      return replyWithContext(`📛 Debes responder a un sticker`, [senderJid]);
    }

    const packsDB = loadPacksDB();
    const userPacks = packsDB[senderNumber]?.packs;

    if (!userPacks?.length) {
      await react(sock, msg, '📦');
      return replyWithContext(`📦 No tienes packs\n> Crea uno: \`${config.prefix}newpack ${packName}\``, [senderJid]);
    }

    const pack = userPacks.find(p => p.name.toLowerCase() === packName.toLowerCase());
    if (!pack) {
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No existe pack *"${packName}"*`, [senderJid]);
    }

    if (pack.stickers.length >= 50) {
      await react(sock, msg, '🚫');
      return replyWithContext(`🚫 Límite *50/50* en \`${pack.name}\``, [senderJid]);
    }

    try {
      await react(sock, msg, '⏳');

      const quotedMsgObj = {
        key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant || from, fromMe: false },
        message: { stickerMessage: ctx.quotedMessage.stickerMessage }
      };

      const buffer = await downloadMediaMessage(quotedMsgObj, 'buffer', {}, {
        logger: console,
        reuploadRequest: sock.updateMediaMessage
      });

      if (!buffer?.length) throw new Error('No se pudo descargar');

      pack.stickers.push({
        id: Date.now().toString(36),
        buffer: buffer.toString('base64'),
        addedAt: Date.now()
      });
      pack.lastModified = Date.now();
      savePacksDB(packsDB);

      await react(sock, msg, '✅');
      return replyWithContext(`✅ Sticker agregado a *${pack.name}* (${pack.stickers.length}/50)`, [senderJid]);

    } catch (e) {
      console.error('addsticker:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};