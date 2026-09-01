import axios from 'axios';

const API = 'https://api-varhad.my.id/ai/dolphin';

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'dolphin',
  alias: ['dolphinai'],
  category: 'IA',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, args } = options;

    const prompt = args.join(' ').trim();
    if(!prompt){
      await react(sock,msg,'❓');
      return replyWithContext(`🐬 Escribe algo\n> Ej: dolphin que es la vida`, [senderJid]);
    }

    await react(sock,msg,'🐬');

    try{
      const { data } = await axios.get(`${API}?prompt=${encodeURIComponent(prompt)}`, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const answer = data?.result || data?.response;
      if(!answer) throw new Error('sin respuesta');

      await react(sock,msg,'✅');
      return replyWithContext(`🐬 *Dolphin:*\n${answer.slice(0,3500)}`, [senderJid]);

    }catch(e){
      console.error('dolphin:', e.message);
      await react(sock,msg,'❌');
      return replyWithContext(`❌ No pude responder ahora, intenta de nuevo`, [senderJid]);
    }
  }
};