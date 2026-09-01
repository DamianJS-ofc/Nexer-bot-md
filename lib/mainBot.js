import {
    makeWASocket,
    Browsers,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    jidDecode
} from 'infinity'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { smsg } from './message.js'
import { createInfoFolder } from '../utils/createInfoFolder.js'
import { saveLidMapping, getIdFromLid } from './lidResolver.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

if (!global.mainBots) global.mainBots = []

const cleanJid = jid => jid?.replace(/:\d+/, '').split('@')[0]

const createCompleteLogger = () => {
  const noop = () => {}
  return {
    level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => createCompleteLogger()
  }
}

function loadBotConfig(phone) {
  try {
    const configPath = path.join(process.cwd(), 'info', phone, 'config.js');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const jsonMatch = configContent.match(/export default\s+({[\s\S]*})/);
      if (jsonMatch && jsonMatch[1]) {
        const savedConfig = eval('(' + jsonMatch[1] + ')');
        console.log(chalk.green(`[MAINBOT ${phone}] ✅ Config cargada`));
        return savedConfig;
      }
    }
  } catch (e) {
    console.log(chalk.yellow(`[MAINBOT ${phone}] ⚠️ Error config:`, e.message));
  }
  return null;
}

let codeGeneratedForMain = {};

export async function mainBot({
  m = null, client = null, phone, chatId = null,
  onSuccess = null, onError = null, joinGroup = true, isAutoReconnect = false
}) {
  const id = phone || (m? cleanJid(m?.sender) : phone)
  const sessionDir = `./Sessions/Main/${id}`

  console.log(chalk.blue(`[MAINBOT ${phone}] Iniciando ${isAutoReconnect? 'auto-reconnect' : 'nuevo'}`));

  if (!m) m = { sender: phone + '@s.whatsapp.net' }
  if (!fs.existsSync('./Sessions/Main')) fs.mkdirSync('./Sessions/Main', { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: state, version, printQRInTerminal: false,
    browser: Browsers.windows('Edge'),
    markOnlineOnConnect: true, syncFullHistory: false,
    logger: createCompleteLogger()
  })

  if (!client) client = sock
  if (!chatId) chatId = phone + '@s.whatsapp.net'

  let qrSent = false, connectedSuccessfully = false, qrTimeout = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  if (!codeGeneratedForMain[phone]) codeGeneratedForMain[phone] = false

  sock.isSubBot = false; sock.isMainBot = true; sock.sessionType = 'main'; sock.phoneNumber = phone
  sock.ev.on('creds.update', saveCreds)

  sock.decodeJid = jid => {
    if (!jid) return jid
    if (String(jid).endsWith('@lid')) {
        const r = getIdFromLid(jid)
        if (r) return r
    }
    if (/:\d+@/.test(jid)) {
      const d = jidDecode(jid)
      return d?.user && d?.server? `${d.user}@${d.server}` : jid
    }
    return jid
  }

  // === CONFIG ACTUALIZADO SIN MESS ===
  let mainBotConfig = loadBotConfig(phone);
  if (!mainBotConfig) {
    mainBotConfig = {
      name: 'NEXER BOT',
      name1: 'NEXER BOT',
      name2: 'NEXER BOT MD',
      prefix: '.',
      tipo: 'owner',
      info: 'Iniciando sistema...',
      version: '5.6.0',
      navegador: ['Ubuntu', 'Chrome', '110.0.0.0'],
      baileys: ['Edge', 'Chrome', '110.0.0.0'],
      sessionName: 'session',
      botowner: '5492645746772',
      creador: 'DamianJS-ofc',
      owner: ['5492645746772', '5492645576493'],
      packname: 'NEXER BOT MD',
      author: 'DamianJS-ofc',
      img: 'https://raw.githubusercontent.com/JTxs00/uploads/main/1788207438786.jpeg',
      imgMenu: 'https://raw.githubusercontent.com/JTxs00/uploads/main/1788207438786.jpeg',
      channel: {
        id: '120363425415754278@newsletter',
        name: '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿',
        link: 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U'
      },
      economy: {
        initialCoins: 500,
        initialExp: 0,
        maxBet: 5000,
        minBet: 5
      }
    };
    console.log(chalk.yellow(`[MAINBOT ${phone}] ⚠️ Usando config NEXER por defecto (sin mess)`));
  }

  // compatibilidad: si viene config viejo con canalId, lo pasamos a channel
  if (!mainBotConfig.channel && mainBotConfig.canalId) {
    mainBotConfig.channel = {
        id: mainBotConfig.canalId,
        name: mainBotConfig.canalNombre || '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿',
        link: mainBotConfig.group3 || 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U'
    }
  }
  if (!Array.isArray(mainBotConfig.owner)) mainBotConfig.owner = mainBotConfig.owner? [mainBotConfig.owner] : [];

  let handler = null
  let plugins = new Map()

  async function loadHandlerAndPlugins() {
    try {
      const pluginsDir = './plugins'
      if (fs.existsSync(pluginsDir)) {
        const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js') &&!f.startsWith('_'))
        if (!isAutoReconnect) console.log(chalk.cyan(`[MAINBOT ${phone}] ${pluginFiles.length} plugins`))
        for (const file of pluginFiles) {
          try {
            const pluginUrl = new URL(`../plugins/${file}`, import.meta.url).href + `?v=${Date.now()}`
            const mod = await import(pluginUrl)
            if (mod.default?.name) {
              plugins.set(mod.default.name.toLowerCase(), mod.default)
              if (mod.default.alias) {
                if (Array.isArray(mod.default.alias)) mod.default.alias.forEach(a => plugins.set(a.toLowerCase(), mod.default))
                else plugins.set(mod.default.alias.toLowerCase(), mod.default)
              }
            }
          } catch (e) {
            console.log(chalk.yellow(`[MAINBOT ${phone}] ❌ ${file}:`, e.message))
          }
        }
      }
      try {
        const handlerUrl = new URL('../handler.js', import.meta.url).href + `?v=${Date.now()}`
        handler = (await import(handlerUrl)).default
        console.log(chalk.green(`[MAINBOT ${phone}] ✅ Handler cargado`))
      } catch (e) {
        console.log(chalk.red(`[MAINBOT ${phone}] ❌ Handler:`, e.message))
      }
    } catch (e) {
      console.log(chalk.red(`[MAINBOT ${phone}] Error recursos:`, e.message))
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message) return;
      try {
        const pn = msg.key?.participantAlt || msg.key?.senderPn || msg.participantAlt
        const lid = msg.key?.participant || msg.participant || msg.key?.senderLid
        if (pn && lid && String(lid).includes('@lid')) saveLidMapping(lid, pn)
      } catch {}
      if (handler && plugins.size > 0) await handler(sock, msg, plugins, mainBotConfig)
    } catch (e) {
      console.error(chalk.red(`[MAINBOT ${phone}] Error handler:`), e.message)
    }
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && phone &&!qrSent &&!isAutoReconnect &&!codeGeneratedForMain[phone]) {
      try {
        codeGeneratedForMain[phone] = true; qrSent = true
        if (qrTimeout) clearTimeout(qrTimeout);
        let code = await sock.requestPairingCode(phone)
        code = code.match(/.{1,4}/g)?.join('-') || code
        console.log(chalk.green(`[MAINBOT ${phone}] Código: ${code}`))
        if (client && chatId) {
          try {
            const codeMessage = await client.sendMessage(chatId, { text: `*${code}*` });
            setTimeout(async () => { try { await client.sendMessage(chatId, { delete: codeMessage.key }); } catch {} }, 60_000);
          } catch {}
        }
        qrTimeout = setTimeout(() => {
          if (!connectedSuccessfully && typeof onError === 'function') onError(new Error('QR expirado'));
        }, 65_000);
      } catch (e) {
        if (typeof onError === 'function') onError(e);
      }
    }

    if (connection === 'open') {
      connectedSuccessfully = true; reconnectAttempts = 0
      sock.userId = cleanJid(sock.user.id); sock.phoneNumber = phone
      const i = global.mainBots.findIndex(c => c.userId === sock.userId);
      if (i === -1) global.mainBots.push(sock); else global.mainBots[i] = sock
      console.log(chalk.green(`[MAINBOT ${phone}] ✅ Conectado NEXER ${mainBotConfig.version}`))
      const refreshed = loadBotConfig(phone);
      if (refreshed) mainBotConfig = refreshed
      try {
        const result = createInfoFolder(phone, 'main', mainBotConfig)
        if (result.success) console.log(chalk.green(`[MAINBOT ${phone}] ✅ info lista`))
      } catch {}
      if (typeof onSuccess === 'function') onSuccess(sock.userId);
      await loadHandlerAndPlugins()
      console.log(chalk.cyan(`[MAINBOT ${phone}] 📂 Plugins: ${plugins.size} | Prefix: ${mainBotConfig.prefix}`));
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const isLoggedOut = reason === DisconnectReason.loggedOut
      console.log(chalk.red(`[MAINBOT ${phone}] ❌ Desconectado (${reason})`))
      if (sock.userId) global.mainBots = global.mainBots.filter(c => c.userId!== sock.userId);
      if (isLoggedOut) {
        try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
        return;
      }
      if (!isLoggedOut) {
        reconnectAttempts++;
        if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            mainBot({ m: { sender: phone + '@s.whatsapp.net' }, client: sock, phone, chatId: phone + '@s.whatsapp.net', onSuccess: null, onError: null, joinGroup: false, isAutoReconnect: true });
          }, 3000);
        }
      }
    }
  })
  return sock
}

export function initializeMainBotManager() {
    console.log(chalk.cyan('[MAIN MANAGER] NEXER Iniciado sin mess'));
}
export function getMainBotStatus() {
    return { total: global.mainBots.length, active: global.mainBots.length }
}
export default { mainBot, initializeMainBotManager, getMainBotStatus }