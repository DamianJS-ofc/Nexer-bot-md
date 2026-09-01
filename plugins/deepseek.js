const API_URL = 'https://www.api-g4nggaa.biz.id/api/ai/deepseek';
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'deepseek',
  alias: ['ds', 'ia'],
  category: 'IA',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, args } = options;

    const prompt = args.join(' ').trim();
    if(!prompt){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Escribe algo\n> Ej: \`deepseek que es js?\``, [senderJid]);
    }

    try{
      await react(sock, msg, '🤔');

      const controller = new AbortController();
      const timeout = setTimeout(()=> controller.abort(), 30000);

      const res = await fetch(`${API_URL}?text=${encodeURIComponent(prompt)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NEXER/1.0' }
      });
      clearTimeout(timeout);

      if(!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      let answer = data?.result || data?.response || data?.message;
      if(!answer) throw new Error('Sin respuesta');

      answer = answer.replace(/\[DONE\]$/,'').trim().slice(0, 3500);

      await react(sock, msg, '✅');
      return replyWithContext(`*DEEPSEEK*\n\n${answer}`, [senderJid]);

    }catch(e){
      console.error('deepseek:', e);
      await react(sock, msg, '❌');
      if(e.name==='AbortError') return replyWithContext(`⏳ API muy lenta, intenta luego`, [senderJid]);
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};