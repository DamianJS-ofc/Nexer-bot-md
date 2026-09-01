import fs from 'fs';
import path from 'path';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

function getTarget(options, msg){
  const { usersDB, args } = options;
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  let jid = ctx?.mentionedJid?.[0] || ctx?.participant || null;
  let num = null;

  if(args[0] && /^\d+$/.test(args[0])){
    num = args[0].replace(/\D/g,'');
    jid = `${num}@s.whatsapp.net`;
  }else if(jid){
    const id = jid.split('@')[0];
    for(const [n,d] of Object.entries(usersDB||{})){
      if(d.lid === jid || d.lid === id || d.jid === jid){ num = n; break; }
    }
    if(!num && /^\d+$/.test(id)) num = id;
  }
  return { jid, num };
}

export default {
  name: 'delmod',
  alias: ['unmod','quitarstaff'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner, usersDB, config } = options;

    if(!isOwner) return replyWithContext(`📛 Solo owner`, [senderJid]);

    const { jid, num } = getTarget(options, msg);
    if(!num){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Menciona, responde o pon numero\n> Ej: \`${config.prefix}delmod @user\``, [senderJid]);
    }

    if(!usersDB[num]) return replyWithContext(`❌ ${num} no registrado`, [senderJid]);
    if(!usersDB[num].rank){
      const mJid = usersDB[num].jid || jid;
      return replyWithContext(`🎍 @${num} no tiene rango`, [mJid]);
    }

    const old = usersDB[num].rank;
    delete usersDB[num].rank;
    delete usersDB[num].rankAssignedAt;
    delete usersDB[num].rankAssignedBy;

    fs.writeFileSync(path.join(process.cwd(),'databases','users.json'), JSON.stringify(usersDB,null,2));

    await react(sock, msg, '✅');
    const mJid = usersDB[num].jid || jid;
    return replyWithContext(`✅ @${num} ya no es *${old}*`, [mJid]);
  }
};