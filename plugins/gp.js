import fs from 'fs';
import path from 'path';

const PRIMARIOS_FILE = path.join(process.cwd(), 'databases', 'primarios.json');
const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'gp',
  alias: ['groupinfo','infogp'],
  category: 'Grupos',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid } = options;
      const from = msg.key.remoteJid;

      if(!from.endsWith('@g.us')){
        await react(sock,msg,'📛');
        return replyWithContext(`📛 Solo en grupos`, [senderJid]);
      }

      await react(sock,msg,'🔍');

      const metadata = await sock.groupMetadata(from);
      const admins = metadata.participants.filter(p=> p.admin);

      let primarioJid = null;
      let primarioNombre = 'No definido';
      let primarioTipo = 'No definido';

      if(fs.existsSync(PRIMARIOS_FILE)){
        try{
          const db = JSON.parse(fs.readFileSync(PRIMARIOS_FILE,'utf8'));
          const entry = db[from];
          if(entry){
            const phone = entry.botPhone.replace(/\D/g,'');
            primarioJid = `${phone}@s.whatsapp.net`;
            primarioNombre = entry.botNombre || 'Bot';
            primarioTipo = entry.botType || 'Principal';
          }
        }catch{}
      }

      // Contar bots en grupo
      let activeBots = [];
      try{
        const credsPath = path.join(process.cwd(), 'sessions', 'creds.json');
        if(fs.existsSync(credsPath)){
          const creds = JSON.parse(fs.readFileSync(credsPath,'utf8'));
          if(creds?.me?.id) activeBots.push(creds.me.id.split(':')[0].replace(/\D/g,''));
        }
      }catch{}
      for(const dir of ['Sessions/Main','Sessions/Subs']){
        const full = path.join(process.cwd(), dir);
        if(fs.existsSync(full)){
          const folders = fs.readdirSync(full, {withFileTypes:true}).filter(d=>d.isDirectory()).map(f=>f.name);
          activeBots.push(...folders);
        }
      }

      const botsInGroup = metadata.participants.filter(p=> activeBots.includes(p.id.split('@')[0].replace(/\D/g,''))).length;

      let pp;
      try{ pp = await sock.profilePictureUrl(from,'image'); }catch{ pp = 'https://telegra.ph/file/241f050c4bcc293340fca.jpg'; }

      let caption = `Info Grupo\n\nNombre: ${metadata.subject}\nIntegrantes: ${metadata.participants.length}\nAdmins: ${admins.length}\nBots: ${botsInGroup}\nID: ${from}\n\nBot primario: ${primarioJid? '@'+primarioJid.split('@')[0] : 'No definido'}\nNombre bot: ${primarioNombre}\nTipo: ${primarioTipo}`;
      if(metadata.desc) caption += `\n\nDescripcion:\n${metadata.desc}`;

      await sock.sendMessage(from, {
        image: { url: pp },
        caption,
        mentions: primarioJid? [primarioJid] : []
      }, {quoted: msg});

      await react(sock,msg,'✅');

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};
