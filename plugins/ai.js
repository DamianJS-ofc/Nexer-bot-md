import axios from 'axios';
const APIS = [
  { name: 'Varhad', url: 'https://v2.api-varhad.my.id/ai/gemini', param: 'prompt', get: d => d?.result?.text },
  { name: 'NeoAPIs', url: 'https://www.neoapis.xyz/api/ai/gemini', param: 'text', get: d => d?.data?.answer },
  { name: 'NexRay', url: 'https://api.nexray.web.id/ai/gemini', param: 'text', get: d => d?.result }
];
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});
export default {
  name: 'ai',
  alias: ['gemini', 'ia'],
  category: 'IA',
  async execute(sock, msg, options) {
    const { args, replyWithContext, pushName } = options;
    const prompt = args.join(' ').trim();
    if (!prompt) { await react(sock, msg, '❓'); return replyWithContext(`✳️ Debes escribir una pregunta`, [options.senderJid]); }
    try {
      await react(sock, msg, '🧠');
      let answer = null, used = '';
      for (const api of APIS) {
        try {
          const { data } = await axios.get(`${api.url}?${api.param}=${encodeURIComponent(prompt)}`, { timeout: 15000 });
          const res = api.get(data); if (res) { answer = res; used = api.name; break; }
        } catch { continue; }
      }
      if (!answer) throw new Error('Sin respuesta');
      await react(sock, msg, '✅');
      return replyWithContext(`*${used} • AI*\n\n${answer.slice(0,3500)}`, [options.senderJid]);
    } catch { await react(sock, msg, '❌'); return replyWithContext(`❌ No se pudo obtener respuesta`, [options.senderJid]); }
  }
};