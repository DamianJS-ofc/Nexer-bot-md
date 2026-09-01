import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, '..', 'temp');

const formatSize = (b) => {
  if (!b) return '0 B';
  const k=1024, s=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(b)/Math.log(k));
  return `${(b/Math.pow(k,i)).toFixed(2)} ${s[i]}`;
};
const getFolderSize = (dir) => {
  let t=0;
  try{
    if(!fs.existsSync(dir)) return 0;
    for(const f of fs.readdirSync(dir)){
      const p=path.join(dir,f);
      const st=fs.statSync(p);
      t+= st.isFile()? st.size : getFolderSize(p);
    }
  }catch{}
  return t;
};

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'cleartemp',
  alias: ['limpiartemp'],
  category: 'Owner',

  async execute(sock, msg, options) {
    const { replyWithContext, senderJid, isOwner } = options;

    if (!isOwner) {
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Solo owner`, [senderJid]);
    }

    if (!fs.existsSync(TEMP_DIR)) {
      return replyWithContext(`📁 No existe carpeta temp`, [senderJid]);
    }

    try{
      await react(sock, msg, '🧹');
      const before = getFolderSize(TEMP_DIR);
      let count=0, freed=0;

      for(const f of fs.readdirSync(TEMP_DIR)){
        const p=path.join(TEMP_DIR,f);
        try{
          const st=fs.statSync(p);
          if(st.isFile()){ freed+=st.size; fs.unlinkSync(p); }
          else{ freed+=getFolderSize(p); fs.rmSync(p,{recursive:true,force:true}); }
          count++;
        }catch{}
      }

      const after=getFolderSize(TEMP_DIR);
      await react(sock, msg, '✅');
      return replyWithContext(`*TEMP LIMPIADO*\n\n> 🗑️ Archivos: ${count}\n> 💾 Liberado: ${formatSize(freed)}\n> 📦 Antes: ${formatSize(before)}\n> 📦 Ahora: ${formatSize(after)}`, [senderJid]);

    }catch(e){
      console.error('cleartemp:',e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};