import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'backup',
  alias: ['bk'],
  category: 'Owner',

  async execute(sock, msg, options) {
    const { config, senderJid, pushName, replyWithContext, isOwner } = options;
    const from = msg.key.remoteJid;

    if (!isOwner) {
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Este comando es solo para owner`, [senderJid]);
    }

    try {
      await react(sock, msg, '📦');
      await replyWithContext(`⏳ Creando backup, enviando al privado...`, [senderJid]);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const zipName = `${config.name || 'nexer'}-backup-${timestamp}.zip`;
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const zipPath = path.join(tempDir, zipName);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);

      const items = ['databases', 'plugins', 'lib', 'config.js', 'handler.js', 'index.js', 'package.json'];

      for (const item of items) {
        const p = path.join(__dirname, '..', item);
        if (!fs.existsSync(p)) continue;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) archive.directory(p, item);
        else archive.file(p, { name: item });
      }

      await archive.finalize();
      await new Promise((res, rej) => { output.on('close', res); output.on('error', rej); });

      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      if (archive.pointer() > 95 * 1024 * 1024) {
        fs.unlinkSync(zipPath);
        await react(sock, msg, '⚠️');
        return replyWithContext(`⚠️ Backup muy grande (${sizeMB}MB) supera límite de WhatsApp`, [senderJid]);
      }

      // Enviar al PRIVADO del owner que solicitó
      const ownerPrivateJid = senderJid; // JID del que ejecutó
      const zipBuffer = fs.readFileSync(zipPath);

      await sock.sendMessage(ownerPrivateJid, {
        document: zipBuffer,
        fileName: zipName,
        mimetype: 'application/zip',
        caption: `*BACKUP • ${config.name}*\n\n> 📊 Tamaño: ${sizeMB} MB\n> 📅 Fecha: ${new Date().toLocaleString()}\n> 👤 Solicitado por: ${pushName}\n> 📍 Origen: ${from.endsWith('@g.us')? 'Grupo' : 'Privado'}`
      });

      if (from.endsWith('@g.us')) {
        await replyWithContext(`✅ Backup enviado a tu privado`, [senderJid]);
      }

      await react(sock, msg, '✅');

      setTimeout(()=>{ try{ fs.unlinkSync(zipPath); }catch{} }, 30000);

    } catch (e) {
      console.error('backup:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [options.senderJid]);
    }
  }
};
