import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'catdesc',
  alias: ['setcatdesc'],
  category: 'Owner',

  async execute(sock, msg, options) {
    const { args, config, replyWithContext, senderJid, isOwner } = options;

    if (!isOwner) {
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Solo owner`, [senderJid]);
    }

    const input = args.join(' ');
    const [rawName,...descParts] = input.split('=');
    const categoryName = rawName?.trim();
    const description = descParts.join('=').trim();

    if (!categoryName ||!description) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Uso: \`${config.prefix}catdesc Categoria = Descripcion\`\n> Ej: \`${config.prefix}catdesc Utiles = Herramientas varias\``, [senderJid]);
    }

    try {
      const menuPath = path.join(__dirname, '..', 'databases', 'menu.json');
      let menuData = { categories: [], banner: 'img/banner.jpg', commandDescriptions: {}, categoryDescriptions: {} };

      if (fs.existsSync(menuPath)) {
        try { menuData = JSON.parse(fs.readFileSync(menuPath,'utf8')); } catch {}
      }

      const exists = menuData.categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (!exists) {
        await react(sock, msg, '❌');
        return replyWithContext(`❌ La categoría *${categoryName}* no existe\n> Creala con \`${config.prefix}setcat ${categoryName}\``, [senderJid]);
      }

      // buscar nombre real con mayúscula
      const realCat = menuData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase()).name;

      menuData.categoryDescriptions = menuData.categoryDescriptions || {};
      menuData.categoryDescriptions[realCat] = description;

      fs.mkdirSync(path.dirname(menuPath), { recursive: true });
      fs.writeFileSync(menuPath, JSON.stringify(menuData, null, 2));

      await react(sock, msg, '✅');
      return replyWithContext(`✅ Descripción de *${realCat}* actualizada:\n> ${description}`, [senderJid]);

    } catch (e) {
      console.error('catdesc:', e);
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};
