import { startSubBot } from '../lib/startSubBot.js'
import fs from 'fs'
import path from 'path'

const cooldowns = new Map();
const pendingCodes = new Map();
const MAX_SUB_BOTS = 25;

function countExistingSubBots(){
  try{
    const dir = path.join(process.cwd(), 'Sessions', 'Subs');
    if(!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes:true }).filter(d=>d.isDirectory()).length;
  }catch{ return 0; }
}

const getUserPhone = (msg) => {
  if(msg.key?.participantAlt) return msg.key.participantAlt.split('@')[0];
  const jid = msg.key.remoteJid;
  if(!jid.endsWith('@g.us') && jid.includes('@s.whatsapp.net')) return jid.split('@')[0];
  return null;
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'code',
  alias: ['jadibot', 'serbot', 'subbot'],
  category: 'SubBots',

  async execute(sock, msg, options){
    const { config, replyWithContext, senderJid } = options;
    const from = msg.key.remoteJid;

    if(countExistingSubBots() >= MAX_SUB_BOTS){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Límite de ${MAX_SUB_BOTS} sub-bots alcanzado, intenta más tarde`, [senderJid]);
    }

    let phone = getUserPhone(msg)?.replace(/\D/g,'') || options.args[0]?.replace(/\D/g,'');

    if(!phone || phone.length < 8 || phone.length > 15){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Uso: \`${config.prefix}code <numero>\`\n> Ej: \`${config.prefix}code 521999...`, [senderJid]);
    }

    const userKey = `${from}-${msg.key?.participant || from}`;
    const now = Date.now();
    const COOLDOWN = 2*60*1000;

    if(cooldowns.has(userKey) && now < cooldowns.get(userKey)+COOLDOWN){
      const left = Math.ceil((cooldowns.get(userKey)+COOLDOWN - now)/1000);
      return replyWithContext(`⏳ Espera ${left}s para pedir otro código`, [senderJid]);
    }
    if(pendingCodes.has(phone) && now < pendingCodes.get(phone).expiresAt){
      return replyWithContext(`⏳ Ya hay un código pendiente para ${phone}`, [senderJid]);
    }

    cooldowns.set(userKey, now);
    setTimeout(()=>cooldowns.delete(userKey), COOLDOWN);

    try{
      pendingCodes.set(phone, { chatId: from, expiresAt: now+60*1000 });

      const expTimer = setTimeout(async()=>{
        if(pendingCodes.has(phone)){
          pendingCodes.delete(phone);
          await replyWithContext(`⌛ Tiempo de vinculación agotado para ${phone}, intenta de nuevo`, [senderJid]).catch(()=>{});
        }
      },60*1000);

      await react(sock, msg, '⏳');
      const instructions = await replyWithContext(
        `*VINCULAR SUB-BOT*\n\n> 1. Ajustes > Dispositivos vinculados\n> 2. Vincular dispositivo\n> 3. Vincular con número\n\n⚠️ No uses tu cuenta principal`,
        [senderJid]
      );

      await startSubBot({
        m: msg,
        client: sock,
        phone,
        chatId: from,
        caption: '',
        joinGroup: true,
        onSuccess: async(connectedNumber)=>{
          clearTimeout(expTimer);
          pendingCodes.delete(phone);
          setTimeout(()=> sock.sendMessage(from,{delete: instructions.key}).catch(()=>{}), 60_000);
          await react(sock, msg, '✅');
          await replyWithContext(`✅ *Sub-Bot vinculado*\n\n> 👤 User: @${phone}\n> 📞 Número: ${connectedNumber||phone}\n\n> Personaliza con:\n> \`${config.prefix}setbanner\`\n> \`${config.prefix}setname\``, [senderJid]);
        },
        onError: (e)=>{
          clearTimeout(expTimer);
          pendingCodes.delete(phone);
          console.error('subbot error:', e?.message||e);
        }
      });

    }catch(e){
      console.error('code:', e);
      pendingCodes.delete(phone);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};