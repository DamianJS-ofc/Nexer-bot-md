import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '..', 'databases', 'users.json');
const LEVEL_FILE = path.join(__dirname, '..', 'databases', 'level.json');

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'db',
  alias: ['userslist'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner } = options;
    const from = msg.key.remoteJid;

    if(!isOwner){
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Solo owner`, [senderJid]);
    }

    try{
      await react(sock, msg, '📊');

      let usersDB = {}, levelDB = {};
      try{
        if(fs.existsSync(USERS_FILE)) usersDB = JSON.parse(fs.readFileSync(USERS_FILE,'utf8'));
        if(fs.existsSync(LEVEL_FILE)) levelDB = JSON.parse(fs.readFileSync(LEVEL_FILE,'utf8'));
      }catch(e){ return replyWithContext(`❌ Error leyendo DB: ${e.message}`, [senderJid]); }

      const total = Object.keys(usersDB).length;
      if(!total) return replyWithContext(`📁 Sin usuarios registrados`, [senderJid]);

      let text = `*DATABASE - USUARIOS*\n> Total: ${total}\n\n`;
      const sorted = Object.entries(usersDB).sort((a,b)=> (b[1].level||0)-(a[1].level||0)).slice(0,50);

      for(const [num, u] of sorted){
        const lv = levelDB[num] || { level:1, exp:0, commands:0 };
        text += `• ${u.pushName||u.name||'Sin nombre'} - ${num}\n Lv.${lv.level} | Exp ${lv.exp} | Cmd ${lv.commands}\n\n`;
      }

      if(total > 50) text += `_...y ${total-50} más. Revisa el archivo users.json_\n`;

      // Si es muy largo manda como archivo
      if(text.length > 4000){
        const filePath = path.join(__dirname, '..', 'temp', `db_${Date.now()}.txt`);
        fs.writeFileSync(filePath, text);
        await sock.sendMessage(from, { document: fs.readFileSync(filePath), mimetype: 'text/plain', fileName: `db_${total}users.txt`, caption: `*DATABASE*\nTotal: ${total} users` }, { quoted: msg });
        try{ fs.unlinkSync(filePath); }catch{}
      } else {
        await replyWithContext(text, [senderJid]);
      }

      await react(sock, msg, '✅');

    }catch(e){
      console.error('db:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ ${e.message}`, [senderJid]);
    }
  }
};