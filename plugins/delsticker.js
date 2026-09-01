import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const PACKS_FILE = path.join(process.cwd(), 'databases', 'packs.json');
const load = () => fs.existsSync(PACKS_FILE)? JSON.parse(fs.readFileSync(PACKS_FILE,'utf8')) : {};
const save = (db) => fs.writeFileSync(PACKS_FILE, JSON.stringify(db,null,2));

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delsticker',
  alias: ['removesticker','delstick'],
  category: 'Stickers',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, senderNumber, args, config } = options;
    const from = msg.key.remoteJid;

    const packName = args.join(' ').trim();
    if(!packName){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon nombre del pack y responde al sticker\n> Ej: \`${config.prefix}delsticker MiPack\` (respondiendo a sticker)`, [senderJid]);
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    if(!quoted?.stickerMessage){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Responde a un sticker para borrarlo`, [senderJid]);
    }

    const db = load();
    if(!db[senderNumber]?.packs?.length){
      return replyWithContext(`❌ No tienes packs`, [senderJid]);
    }

    const pack = db[senderNumber].packs.find(p=> p.name.toLowerCase() === packName.toLowerCase());
    if(!pack) return replyWithContext(`❌ No tienes pack "${packName}"`, [senderJid]);

    try{
      const qObj = {
        key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant || from, fromMe: false },
        message: { stickerMessage: quoted.stickerMessage }
      };

      const buf = await downloadMediaMessage(qObj, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
      if(!buf?.length) throw new Error('No se descargo');

      const b64 = buf.toString('base64');
      const before = pack.stickers.length;

      pack.stickers = pack.stickers.filter(s=> s.buffer!== b64 && s!== b64);

      if(before === pack.stickers.length){
        await react(sock, msg, '❌');
        return replyWithContext(`❌ Ese sticker no esta en *${pack.name}*`, [senderJid]);
      }

      pack.lastModified = Date.now().toString();
      save(db);

      await react(sock, msg, '🗑️');
      return replyWithContext(`✅ Sticker eliminado de *${pack.name}*\n> Quedan: ${pack.stickers.length}`, [senderJid]);

    }catch(e){
      console.error('delsticker:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};