import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

// escanea plugins y arma categorias solo
const scanCommands = () => {
  const categories = {};
  if (!fs.existsSync(PLUGINS_DIR)) return categories;
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PLUGINS_DIR, file), 'utf8');
      const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
      const catMatch = content.match(/category:\s*['"]([^'"]+)['"]/i);
      if (!nameMatch) continue;
      const name = nameMatch[1].toLowerCase();
      const category = (catMatch?.[1] || 'Otros').toLowerCase();
      if (!categories[category]) categories[category] = [];
      categories[category].push(name);
    } catch {}
  }
  for (const k in categories) categories[k].sort();
  return categories;
};

export default {
  name: 'help',
  alias: ['menu', 'commands'],
  category: 'General',

  async execute(sock, msg, options) {
    try {
      const { config, pushName, senderJid } = options;
      const from = msg.key.remoteJid;

      let botNumber = '';
      if (sock.phoneNumber) botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
      else if (sock.user?.id) botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');

      let botConfig = {...config };
      if (botNumber) {
        const configPath = path.join(process.cwd(), 'info', botNumber, 'config.js');
        if (fs.existsSync(configPath)) {
          try {
            const raw = fs.readFileSync(configPath, 'utf8');
            const m = raw.match(/export default\s+({[\s\S]*})/);
            if (m) botConfig = eval('(' + m[1] + ')');
          } catch {}
        }
      }

      const prefix = botConfig.prefix || config.prefix;
      const scanned = scanCommands();
      const catNames = Object.keys(scanned).sort();

      const categoryRows = catNames.map(cat => ({
        title: cat.toUpperCase(),
        description: `${scanned[cat].length} comandos`,
        id: `${prefix}allmenu ${cat}`
      }));

      if (!categoryRows.length) {
        categoryRows.push({
          title: "SIN CATEGORIAS",
          description: "No hay comandos",
          id: `${prefix}allmenu`
        });
      }

      // diseño original sin ★ y sin 🎮 y sin emojis de mujer/flor
      const menuText = `๋ ${pushName} Bienvenido al menu de categorias\n\n` +
                       `ᅟᅟ ㅤ︵ֵ֟፝⏜╲⋱ ⫶ ⋰╱⏜ֵ፝֟︵\n\n` +
                       ` Bot › ${botConfig.name || config.name}\n` +
                       ` Tipo › ${botConfig.tipo || config.tipo}\n` +
                       ` Developer › DamianJS-ofc\n` +
                       `. ׄ ⌣ ִ ⏜ׄׄ⏜ ִ ⌣\n\n`;

      let bannerBuffer = null;
      let imagePath = '';
      let useImage = false;

      if (botNumber) {
        const bannerPath = path.join(process.cwd(), 'info', botNumber, 'banner.jpg');
        if (fs.existsSync(bannerPath)) {
          try {
            bannerBuffer = fs.readFileSync(bannerPath);
            imagePath = bannerPath;
            if (bannerBuffer.length) useImage = true;
          } catch {}
        }
      }

      if (!useImage) {
        const generalBannerPath = path.join(__dirname, '..', 'img', 'banner.jpg');
        if (fs.existsSync(generalBannerPath)) {
          try {
            bannerBuffer = fs.readFileSync(generalBannerPath);
            imagePath = generalBannerPath;
            if (bannerBuffer.length) useImage = true;
          } catch {}
        }
      }

      let messageSent = false;

      if (useImage && bannerBuffer) {
        try {
          const mimeType = imagePath.endsWith('.png')? 'image/png' : 'image/jpeg';
          await sock.sendMessage(from, {
            image: bannerBuffer,
            caption: menuText,
            mimetype: mimeType,
            footer: "Selecciona una categoria",
            interactiveButtons: [{
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Seleccionar",
                sections: [{ title: "Categorias Disponibles", rows: categoryRows }]
              }),
            }],
            contextInfo: {
              forwardingScore: 9999999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: botConfig.canalId || config.canalId || '',
                serverMessageId: 0,
                newsletterName: botConfig.canalNombre || config.canalNombre || ''
              }
            }
          }, { quoted: msg });
          messageSent = true;
        } catch {}
      }

      if (!messageSent) {
        await sock.sendMessage(from, {
          text: menuText,
          footer: "Selecciona una categoria",
          interactiveButtons: [{
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "Seleccionar",
              sections: [{ title: "Categorias Disponibles", rows: categoryRows }]
            }),
          }],
          contextInfo: {
            forwardingScore: 9999999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: botConfig.canalId || config.canalId || '',
              serverMessageId: 0,
              newsletterName: botConfig.canalNombre || config.canalNombre || ''
            }
          }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Error en help:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `Error: ${error.message}` }, { quoted: msg });
    }
  }
};