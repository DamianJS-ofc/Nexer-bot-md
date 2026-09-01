import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from 'infinity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'whatmusic',
  alias: ['chazam'],
  category: 'Descargas',

  async execute(sock, msg, options) {
    const { replyWithContext, senderJid } = options;
    const from = msg.key.remoteJid;

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    if (!quoted?.audioMessage &&!quoted?.videoMessage) {
      await react(sock, msg, '❓');
      return replyWithContext(`🎵 Responde a un audio/video`, [senderJid]);
    }

    try {
      await react(sock, msg, '🎧');

      const mediaObj = {
        key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant || from, fromMe: false },
        message: quoted
      };
      const buffer = await downloadMediaMessage(mediaObj, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });

      if (!buffer?.length) throw new Error('No se descargó');

      const tmpPath = path.join(tempFolder, `chazam_${Date.now()}.mp3`);
      fs.writeFileSync(tmpPath, buffer);

      const form = new FormData();
      form.append('files[]', fs.createReadStream(tmpPath));
      const upRes = await fetch('https://uguu.se/upload.php', { method: 'POST', headers: form.getHeaders(), body: form });
      const upJson = await upRes.json();
      try{ fs.unlinkSync(tmpPath); }catch{}

      const fileUrl = upJson?.files?.[0]?.url;
      if (!fileUrl) throw new Error('Error subiendo audio');

      const shRes = await fetch(`https://apis-starlights-team.koyeb.app/starlight/shazam?url=${encodeURIComponent(fileUrl)}`);
      const json = await shRes.json();
      if (json.error) throw new Error('No reconocida');

      const d = json.data || json;
      const text = `*SHAZAM*\n\n> 🎵 ${d.title}\n> 👤 ${d.artist}\n> 🎶 ${d.gender || 'N/A'}\n> 🔗 ${d.url || ''}`.trim();

      await replyWithContext(text, [senderJid]);
      await react(sock, msg, '✅');

    } catch (e) {
      console.error('chazam:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ ${e.message}`, [senderJid]);
    }
  }
};