import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delcat',
  alias: ['rmcat'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, args, config } = options;
    const from = msg.key.remoteJid;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const catName = args.join(' ').trim();
    if(!catName){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon categoria\n> Ej: \`${config.prefix}delcat anime\``, [senderJid]);
    }

    const catFile = path.join(process.cwd(), 'databases', 'categories.json');
    const descFile = path.join(process.cwd(), 'databases', 'gif_descriptions.json');
    const videosDirBase = path.join(process.cwd(), 'videos');

    if(!fs.existsSync(catFile)) return replyWithContext(`❌ No existe categories.json`, [senderJid]);

    let categories = JSON.parse(fs.readFileSync(catFile,'utf8'));
    const key = Object.keys(categories).find(k=> k.toLowerCase() === catName.toLowerCase());

    if(!key) return replyWithContext(`❌ Categoria *${catName}* no existe`, [senderJid]);

    const total = categories[key]?.videos?.length || 0;

    // borrar videos/
    const dir = path.join(videosDirBase, key);
    if(fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

    // borrar de json
    delete categories[key];
    fs.writeFileSync(catFile, JSON.stringify(categories, null, 2));

    // borrar descripcion
    if(fs.existsSync(descFile)){
      const descs = JSON.parse(fs.readFileSync(descFile,'utf8'));
      if(descs[key]){
        delete descs[key];
        fs.writeFileSync(descFile, JSON.stringify(descs, null, 2));
      }
    }

    await react(sock, msg, '🗑️');
    return replyWithContext(`✅ *Categoria eliminada*\n> 📁 ${key}\n> 🎬 Videos: ${total}`, [senderJid]);
  }
};