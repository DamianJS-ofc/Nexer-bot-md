import { mainBot } from '../lib/mainBot.js'

const cooldowns = new Map();
const ALLOWED_RANKS = ['owner','c-owner','srmod','mod'];

const getRealNumber = (usersDB, jid) => {
  if(!jid||!usersDB) return null;
  const id = jid.split('@')[0];
  for(const [num,d] of Object.entries(usersDB)){
    if(d.lid===jid || d.lid===id) return num;
    if(d.jid===jid || d.jid===id) return num;
  }
  if(/^\d+$/.test(id) && id.length>7) return id;
  return null;
};

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'codemod',
  alias: ['codemain'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { config, usersDB, sender, senderNumber, args, replyWithContext, senderJid, isOwner } = options;
    const from = msg.key.remoteJid;
    const phone = args[0]?.replace(/\D/g,'');

    const realNum = getRealNumber(usersDB, sender) || senderNumber;
    const rank = usersDB[realNum]?.rank;
    const hasRank = rank && ALLOWED_RANKS.includes(rank);

    if(!isOwner &&!hasRank){
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Solo owner/mod`, [senderJid]);
    }

    if(!phone ||!/^\d{8,15}$/.test(phone)){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon número\n> Ej: \`${config.prefix}codemod 521999...`, [senderJid]);
    }

    const existsMain = global.mainBots?.some(b=> b.userId?.split('@')[0].split(':')[0].includes(phone));
    const existsSub = global.conns?.some(c=> c.userId?.split('@')[0].split(':')[0].includes(phone));
    if(existsMain) return replyWithContext(`❌ ${phone} ya es main-bot`, [senderJid]);
    if(existsSub) return replyWithContext(`❌ ${phone} ya es sub-bot`, [senderJid]);

    const userKey = `${from}-${realNum}`;
    const now = Date.now();
    if(cooldowns.has(userKey) && now < cooldowns.get(userKey)+120000){
      const left = Math.ceil((cooldowns.get(userKey)+120000-now)/1000);
      return replyWithContext(`⏳ Espera ${left}s`, [senderJid]);
    }
    cooldowns.set(userKey, now);
    setTimeout(()=>cooldowns.delete(userKey), 120000);

    try{
      await react(sock, msg, '⏳');
      let instrMsg = await replyWithContext(`*MAIN-BOT*\n> Ajustes > Disp. vinculados > Vincular con número\n> Expira en 60s`, [senderJid]);

      await mainBot({
        m: msg,
        client: sock,
        phone,
        chatId: from,
        joinGroup: true,
        onSuccess: async(num)=>{
          await react(sock, msg, '✅');
          setTimeout(()=> sock.sendMessage(from,{delete: instrMsg.key}).catch(()=>{}), 2000);
          return replyWithContext(`✅ *Main-Bot vinculado*\n\n> 📞 ${num||phone}\n> 👤 Por: @${realNum}\n> ⚡ Prefijo: ${config.prefix}`, [senderJid]);
        },
        onError: (e)=>{
          console.error('codemod error:', e.message);
          setTimeout(()=> sock.sendMessage(from,{delete: instrMsg.key}).catch(()=>{}), 1000);
        }
      });

    }catch(e){
      console.error('codemod:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ ${e.message}`, [senderJid]);
    }
  }
};