import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => {
  try { return fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE,'utf8')) : {}; } catch { return {}; }
};
const saveEconomy = (db) => {
  try { fs.mkdirSync(path.dirname(ECONOMY_FILE),{recursive:true}); fs.writeFileSync(ECONOMY_FILE, JSON.stringify(db,null,2)); return true; } catch { return false; }
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'alimentar',
  alias: ['mascotas'],
  category: 'Mascotas',

  async execute(sock, msg, options) {
    const { config, args, senderNumber, senderJid, replyWithContext } = options;
    const petName = args.join(' ').trim().toLowerCase();

    if (!petName) {
      await react(sock, msg, '❓');
      return replyWithContext(`🍖 *Alimentar*\n> Uso: \`${config.prefix}alimentar <nombre>\``, [senderJid]);
    }

    const economy = loadEconomy();
    const user = economy[senderNumber];

    if (!user?.pets?.length) {
      await react(sock, msg, '🐾');
      return replyWithContext(`❌ No tienes mascotas\n> Compra: \`${config.prefix}storepets\``, [senderJid]);
    }

    const pet = user.pets.find(p => p.name.toLowerCase().includes(petName));
    if (!pet) {
      const list = user.pets.map(p => `• ${p.emoji} ${p.name}`).join('\n');
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No encontré *${petName}*\n\n🐾 *Tuyas:*\n${list}`, [senderJid]);
    }

    if (!user.foods?.length) {
      await react(sock, msg, '🛒');
      return replyWithContext(`🛒 Sin comida\n> Compra: \`${config.prefix}shop\``, [senderJid]);
    }

    try {
      await react(sock, msg, '⏳');

      const food = user.foods.shift();
      pet.health = Math.min((pet.health || 0) + (food.health || 20), 100);
      saveEconomy(economy);

      await react(sock, msg, '❤️');
      return replyWithContext(
        `*Mascota alimentada*\n\n> 🐾 ${pet.emoji} ${pet.name}\n> 🍽️ ${food.emoji} ${food.name}\n> ❤️ Salud: ${pet.health}%\n> 📦 Te quedan: ${user.foods.length}`,
        [senderJid]
      );
    } catch (e) {
      console.error('alimentar:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};