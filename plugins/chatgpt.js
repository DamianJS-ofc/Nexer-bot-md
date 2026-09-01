import axios from 'axios';

const API_URL = 'https://api.yupra.my.id/api/ai/gpt5';
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'chatgpt',
  alias: ['gpt', 'ia'],
  category: 'IA',

  async execute(sock, msg, options) {
    const { args, replyWithContext, senderJid } = options;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Escribe una pregunta\n> Ej:.gpt que es nodejs`, [senderJid]);
    }

    try {
      await react(sock, msg, '💭');
      const { data } = await axios.get(`${API_URL}?text=${encodeURIComponent(prompt)}`, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const answer = data?.result || data?.response;
      if (!answer) throw new Error('Sin respuesta');

      await replyWithContext(answer.slice(0, 3500), [senderJid]);
      await react(sock, msg, '✅');

    } catch (e) {
      console.error('chatgpt:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error IA, intenta luego`, [senderJid]);
    }
  }
};
