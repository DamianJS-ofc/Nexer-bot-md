import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delfile',
  alias: ['rmfile', 'delplugin'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, args, config } = options;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const fileName = args[0]?.trim();
    if(!fileName){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon ruta\n> Ej: \`${config.prefix}delfile plugins/ping.js\``, [senderJid]);
    }

    if(fileName.includes('..') || fileName.startsWith('/')){
      await react(sock, msg, '📛');
      return replyWithContext(`❌ Ruta no valida`, [senderJid]);
    }

    const fullPath = path.join(process.cwd(), fileName);

    if(!fs.existsSync(fullPath)){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No existe: \`${fileName}\``, [senderJid]);
    }

    const stat = fs.statSync(fullPath);
    if(stat.isDirectory()) return replyWithContext(`❌ Es carpeta, usa otro comando`, [senderJid]);

    try{
      fs.unlinkSync(fullPath);
      await react(sock, msg, '🗑️');
      return replyWithContext(`✅ *Borrado*\n> 📄 \`${fileName}\``, [senderJid]);
    }catch(e){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};