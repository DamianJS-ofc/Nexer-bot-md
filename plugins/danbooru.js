import fetch from 'node-fetch';

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'danbooru',
  alias: ['dbooru'],
  category: 'NSFW',

  async execute(sock, msg, options) {
    const { replyWithContext, senderJid, senderNumber, args, config, usersDB } = options;
    const from = msg.key.remoteJid;

    // anti menores - revisa tu usersDB.age si lo tienes
    // if(usersDB[senderNumber]?.age && usersDB[senderNumber].age < 18) return replyWithContext(`🔞 Solo +18`, [senderJid]);

    if (!from.endsWith('@g.us') &&!options.isOwner) {
      // si quieres solo grupos
    }

    if (!args[0]) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon tags\n> Ej: \`${config.prefix}danbooru neko girl\``, [senderJid]);
    }

    try {
      await react(sock, msg, '🔍');
      const tag = args.join('_');
      const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tag)}&limit=50`;

      const res = await fetch(url, { headers: { 'User-Agent': 'NEXER/1.0' } });
      if (!res.ok) throw new Error(`Danbooru ${res.status}`);

      const json = await res.json();
      const validMedia = json.map(p => p?.file_url || p?.large_file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png|gif)$/i.test(u));

      if (!validMedia.length) {
        await react(sock, msg, '❌');
        return replyWithContext(`❌ Nada para *${tag}*`, [senderJid]);
      }

      const selected = validMedia[Math.floor(Math.random() * validMedia.length)];

      await sock.sendMessage(from, {
        image: { url: selected },
        caption: `*DANBOORU*\n> 🏷️ Tags: ${tag}`
      }, { quoted: msg });

      await react(sock, msg, '✅');

    } catch (e) {
      console.error('danbooru:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};