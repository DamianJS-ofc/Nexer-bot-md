import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delbot',
  alias: ['delsession'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, args, config } = options;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const num = args[0]?.replace(/\D/g,'');
    if(!num || num.length < 8){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon numero\n> Ej: \`${config.prefix}delbot 521999...`, [senderJid]);
    }

    const SESSIONS = path.join(process.cwd(), 'Sessions');
    const paths = [path.join(SESSIONS,'Subs'), path.join(SESSIONS,'Main')];

    let deleted = null;

    for(const base of paths){
      if(!fs.existsSync(base)) continue;
      const folders = fs.readdirSync(base, { withFileTypes: true }).filter(d=>d.isDirectory());
      for(const f of folders){
        if(f.name.replace(/\D/g,'').includes(num)){
          const full = path.join(base, f.name);
          try{
            fs.rmSync(full, { recursive: true, force: true });
            deleted = { path: full, type: base.includes('Main')? 'Main-Bot' : 'Sub-Bot', name: f.name };
            break;
          }catch(e){ console.error(e); }
        }
      }
      if(deleted) break;
    }

    // tambien desconectar si esta vivo
    const allBots = [...(global.mainBots||[]),...(global.conns||[])];
    const live = allBots.find(b=> b.userId?.includes(num));
    if(live){
      try{ await live.logout(); }catch{}
      try{ live.ws?.close(); }catch{}
    }

    if(deleted){
      await react(sock, msg, '🗑️');
      return replyWithContext(`✅ *Eliminado*\n> Tipo: ${deleted.type}\n> Carpeta: ${deleted.name}\n> Numero: ${num}`, [senderJid]);
    }else{
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No encontre sesion para *${num}*`, [senderJid]);
    }
  }
};
