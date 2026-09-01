import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'deldesc',
  alias: ['rmdesc'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, config } = options;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const full = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const clean = full.replace(config.prefix+'deldesc','').trim();

    if(!clean.includes('+')){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Formato: \`${config.prefix}deldesc +categoria +texto\`\n> Ej: \`${config.prefix}deldesc +angry +{user} esta enojado\``, [senderJid]);
    }

    const parts = clean.split('+').slice(1);
    if(parts.length < 2) return replyWithContext(`❌ Debes poner categoria y texto`, [senderJid]);

    const catName = parts[0].trim().toLowerCase();
    const search = parts.slice(1).join('+').trim();

    const descFile = path.join(process.cwd(), 'databases', 'gif_descriptions.json');
    if(!fs.existsSync(descFile)) return replyWithContext(`❌ No hay descripciones`, [senderJid]);

    let descs = JSON.parse(fs.readFileSync(descFile,'utf8'));

    if(!descs[catName]?.length) return replyWithContext(`❌ Sin descripciones en *${catName}*`, [senderJid]);

    const idx = descs[catName].findIndex(d=> (typeof d === 'string'? d : d.text).includes(search));

    if(idx === -1){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No encontre "${search}" en *${catName}*`, [senderJid]);
    }

    const deleted = descs[catName][idx];
    descs[catName].splice(idx,1);
    if(!descs[catName].length) delete descs[catName];

    fs.writeFileSync(descFile, JSON.stringify(descs, null, 2));

    await react(sock, msg, '🗑️');
    return replyWithContext(`✅ *Borrada de ${catName}*\n> ${typeof deleted === 'string'? deleted : deleted.text}`, [senderJid]);
  }
};