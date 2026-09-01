import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MENU_FILE = path.join(__dirname, '..', 'databases', 'menu.json');
let startTime = Date.now();

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

function formatUptime(ms) {
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const h = Math.floor(m/60);
  const d = Math.floor(h/24);
  if (d) return `${d}d ${h%24}h`;
  if (h) return `${h}h ${m%60}m`;
  return `${m}m ${s%60}s`;
}

export default {
  name: 'allmenu',
  alias: ['menuall', 'menúcompleto'],

  async execute(sock, msg, options) {
    const { config, usersDB, pushName, senderJid, args, replyWithContext } = options;
    const from = msg.key.remoteJid;

    try {
      await react(sock, msg, '📜');

      // DB menu
      let menuData = { categories: [] };
      try { if (fs.existsSync(MENU_FILE)) menuData = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8')); } catch {}

      // Filtro categoría
      let cats = menuData.categories || [];
      if (args[0]) {
        const q = args[0].toLowerCase();
        const found = cats.find(c => c.name.toLowerCase() === q);
        if (found) cats = [found];
      }

      // Info bot
      let botNumber = sock.phoneNumber?.replace(/\D/g,'') || sock.user?.id?.split(':')[0].replace(/\D/g,'') || 'bot';
      const totalUsers = Object.keys(usersDB || {}).length;
      const totalPlugins = cats.reduce((a,c)=> a + (c.commands?.length||0), 0);
      const uptime = formatUptime(Date.now() - startTime);

      // Hora MX
      const mxTime = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute:'2-digit', hour12:true });
      const hour = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour12:false, hour:'2-digit' });
      let saludo = Number(hour) < 12? 'Buenos días' : Number(hour) < 19? 'Buenas tardes' : 'Buenas noches';

      // Construir texto serio
      let text = `*${saludo}, ${pushName}*\n`;
      text += `*— ${config.name} | ${config.version || '5.6.0'} —*\n\n`;
      text += `> *Usuario:* ${pushName}\n`;
      text += `> *Prefijo:* ${config.prefix}\n`;
      text += `> *Registros:* ${totalUsers}\n`;
      text += `> *Comandos:* ${totalPlugins}\n`;
      text += `> *Uptime:* ${uptime}\n`;
      text += `> *Hora MX:* ${mxTime}\n`;
      text += `> *Bot:* ${botNumber}\n`;
      text += `\n`;

      if (!cats.length) {
        text += `📛 No hay categorías configuradas.\nUsa \`${config.prefix}setcat\` para crear.`;
      } else {
        for (const cat of cats) {
          text += `*┌─ ${cat.name.toUpperCase()} ─*\n`;
          if (!cat.commands?.length) {
            text += `│ Sin comandos\n`;
          } else {
            for (const cmd of cat.commands) {
              text += `│ ✳️ ${config.prefix}${cmd}\n`;
            }
          }
          text += `*└────────────────*\n\n`;
        }
      }

      text += `> Usa \`${config.prefix}menu <categoria>\` para filtrar.\n`;
      text += `> Ejemplo: \`${config.prefix}menu admin\``;

      // Banner
      let bannerPath = path.join(process.cwd(), 'info', botNumber, 'banner.jpg');
      if (!fs.existsSync(bannerPath)) bannerPath = path.join(__dirname, '..', 'img', 'banner.jpg');

      const channelId = config.channel?.id || '120363425415754278@newsletter';
      const channelName = config.channel?.name || config.name;

      if (fs.existsSync(bannerPath)) {
        const buffer = fs.readFileSync(bannerPath);
        await sock.sendMessage(from, {
          image: buffer,
          caption: text,
          mentions: [senderJid],
          contextInfo: {
            mentionedJid: [senderJid],
            forwardingScore: 9999999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: { newsletterJid: channelId, serverMessageId: 0, newsletterName: channelName }
          }
        }, { quoted: msg });
      }