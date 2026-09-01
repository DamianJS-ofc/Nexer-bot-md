import { sticker } from '../lib/sticker.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metadataFile = path.join(__dirname, '../temp/user_metadata.json');

const loadMeta = () => { try { return fs.existsSync(metadataFile)? JSON.parse(fs.readFileSync(metadataFile,'utf8')) : {}; } catch { return {}; } };
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'brat',
  alias: ['bratsticker'],
  category: 'Stickers',

  async execute(sock, msg, options) {
    const { config, senderNumber, senderJid, args, replyWithContext } = options;
    const text = args.join(' ').trim();

    if (!text) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon un texto\n> Ej: \`${config.prefix}brat hola\``, [senderJid]);
    }

    try {
      await react(sock, msg, '⏳');

      const metadata = loadMeta()[senderNumber] || {};
      const packname = metadata.packname || config.name || '';
      const author = metadata.author || '';

      const { data } = await axios.get(`https://skyzxu-brat.hf.space/brat`, {
        params: { text },
        responseType: 'arraybuffer',
        timeout: 20000
      });

      const stickerBuffer = await sticker(data, null, packname, author);

      await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });
      await react(sock, msg, '✅');

    } catch (e) {
      console.error('brat:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error creando brat`, [options.senderJid]);
    }
  }
};
