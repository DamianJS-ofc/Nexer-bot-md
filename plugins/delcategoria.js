import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delcategoria',
  alias: ['delcat', 'rmcat', 'delcategory'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, args, config } = options;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const catName = args.join(' ').trim().toLowerCase();
    if(!catName){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon categoria\n> Ej: \`${config.prefix}delcategoria love\``, [senderJid]);
    }

    const catFile = path.join(process.cwd(), 'databases', 'categories.json');
    const descFile = path.join(process.cwd(), 'databases', 'gif_descriptions.json');
    const videosDir = path.join(process.cwd(), 'videos', catName);

    if(!fs.existsSync(catFile)) return replyWithContext(`❌ No hay categories.json`, [senderJid]);

    let categories = JSON.parse(fs.readFileSync(catFile,'utf8'));
    const key = Object.keys(categories).find(k=> k.toLowerCase() === catName);

    if(!key){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ La categoria *${catName}* no existe`, [senderJid]);
    }

    const total = categories[key]?.videos?.length || 0;

    if(fs.existsSync(videosDir)) fs.rmSync(videosDir, { recursive: true, force: true });

    delete categories[key];
    fs.writeFileSync(catFile, JSON.stringify(categories, null, 2));

    if(fs.existsSync(descFile)){
      const descs = JSON.parse(fs.readFileSync(descFile,'utf8'));
      if(descs[key]){
        delete descs[key];
        fs.writeFileSync(descFile, JSON.stringify(descs, null, 2));
      }
    }

    await react(sock, msg, '🗑️');
    return replyWithContext(`✅ *Eliminada*\n> 📁 ${key}\n> 🎬 ${total} videos`, [senderJid]);
  }
};