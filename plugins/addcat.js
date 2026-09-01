import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MENU_FILE = path.join(__dirname, '..', 'databases', 'menu.json');

const loadMenu = () => {
  try { return fs.existsSync(MENU_FILE)? JSON.parse(fs.readFileSync(MENU_FILE,'utf8')) : { categories: [] }; } catch { return { categories: [] }; }
};
const saveMenu = (data) => {
  try { fs.mkdirSync(path.dirname(MENU_FILE),{recursive:true}); fs.writeFileSync(MENU_FILE, JSON.stringify(data,null,2)); return true; } catch { return false; }
};
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'addcat',
  alias: ['setcat'],
  category: 'Owner',

  async execute(sock, msg, options) {
    const { args, config, senderJid, replyWithContext, isOwner } = options;
    const categoryName = args.join(' ').trim();

    // Ahora usa owners de config, no hardcode
    if (!isOwner) {
      await react(sock, msg, '📛');
      return replyWithContext(`📛 Este comando es solo para owner`, [senderJid]);
    }

    if (!categoryName) {
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Debes proporcionar el nombre de la categoría\n> Ej: \`${config.prefix}addcat Información\``, [senderJid]);
    }

    const menuData = loadMenu();

    if (menuData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
      await react(sock, msg, '⚠️');
      return replyWithContext(`⚠️ La categoría *"${categoryName}"* ya existe.`, [senderJid]);
    }

    menuData.categories.push({ name: categoryName, commands: [] });

    if (!saveMenu(menuData)) {
      await react(sock, msg, '❌');
      return replyWithContext(`❌ Error al guardar la categoría`, [senderJid]);
    }

    await react(sock, msg, '✅');
    return replyWithContext(`✅ Categoría *"${categoryName}"* agregada correctamente.`, [senderJid]);
  }
};