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

  let mainBotConfig = loadBotConfig(phone);
  if (!mainBotConfig) {
    mainBotConfig = {
      name: 'NEXER BOT', name1: 'NEXER', prefix: '.', tipo: 'owner', version: '5.6.0',
      navegador: ['Ubuntu', 'Chrome', '110.0.0.0'],
      owner: ['5492645746772', '5492645576493'],
      channel: { id: '120363425415754278@newsletter', name: '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿', link: 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U' },
      APIs: {
        xyro: { url: "https://api.xyro.site", key: null },
        vreden: { url: "https://api.vreden.web.id", key: null },
        delirius: { url: "https://api.delirius.store", key: null },
      }
    };
  }
  if (!mainBotConfig.canalId) mainBotConfig.canalId = '120363425415754278@newsletter';
  if (!Array.isArray(mainBotConfig.owner)) mainBotConfig.owner = [mainBotConfig.owner];

  let handler = null
  let plugins = new Map()

  async function loadHandlerAndPlugins() {
    try {
      const pluginsDir = './plugins'
      if (fs.existsSync(pluginsDir)) {
        const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js') &&!f.startsWith('_'))
        if (!isAutoReconnect) console.log(chalk.cyan(`[MAINBOT ${phone}] ${pluginFiles.length} plugins encontrados`))
        for (const file of pluginFiles) {
          try {
            const pluginUrl = new URL(`../plugins/${file}`, import.meta.url).href + `?v=${Date.now()}`
            const pluginModule = await import(pluginUrl)
            if (pluginModule.default?.name) {
              const plugin = pluginModule.default
              plugins.set(plugin.name.toLowerCase(), plugin)
              if (plugin.alias) {
                if (Array.isArray(plugin.alias)) plugin.alias.forEach(a => plugins.set(a.toLowerCase(), plugin))
                else plugins.set(plugin.alias.toLowerCase(), plugin)
              }
              console.log(chalk.green(`⭐ [MAIN ${phone}] ${file} ok`))
            }
          } catch (error) {
            console.log(chalk.red(`❌ [MAIN ${phone}] ${file}: ${error.message}`))
          }
        }
      }
      try {
        const handlerUrl = new URL('../handler.js', import.meta.url).href + `?v=${Date.now()}`
        handler = (await import(handlerUrl)).default
        console.log(chalk.green(`[MAINBOT ${phone}] ✅ Handler cargado`))
      } catch (error) {
        console.log(chalk.red(`[MAINBOT ${phone}] ❌ Handler:`, error.message))
      }
    } catch (error) {
      console.log(chalk.red(`[MAINBOT ${phone}] Error recursos:`, error.message))
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg?.message) return;
      try {
        const pn = msg.key?.participantAlt || msg.key?.senderPn || msg.participantAlt
        const lid = msg.key?.participant || msg.participant || msg.key?.senderLid
        if (pn && lid && String(lid).includes('@lid')) saveLidMapping(lid, pn)
      } catch {}
      if (handler && plugins.size > 0) await handler(sock, msg, plugins, mainBotConfig)
    } catch (error) {
      console.error(chalk.red(`[MAINBOT ${phone}] Error handler:`), error.message)
    }
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    console.log(chalk.blue(`[MAINBOT ${phone}] Conexión: ${connection}`));
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
        console.log(chalk.red(`[MAINBOT ${phone}] PAIRING ERROR`), e.message)
        if (typeof onError === 'function') onError(e);
      }
    }

    if (connection === 'open') {
      connectedSuccessfully = true; reconnectAttempts = 0
      sock.userId = cleanJid(sock.user.id); sock.phoneNumber = phone
      const existingIndex = global.mainBots.findIndex(c => c.userId === sock.userId);
      if (existingIndex === -1) global.mainBots.push(sock); else global.mainBots[existingIndex] = sock
      console.log(chalk.green(`[MAINBOT ${phone}] ✅ Conectado`))
      const refreshedConfig = loadBotConfig(phone);
      if (refreshedConfig) mainBotConfig = refreshedConfig
      try {
        const result = createInfoFolder(phone, 'main', mainBotConfig)
        if (result.success) console.log(chalk.green(`[MAINBOT ${phone}] ✅ info lista`))
      } catch {}
      if (typeof onSuccess === 'function') onSuccess(sock.userId);
      await loadHandlerAndPlugins()
      console.log(chalk.cyan(`[MAINBOT ${phone}] 📂 Plugins: ${plugins.size} | Prefijo: ${mainBotConfig.prefix}`));
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
          console.log(chalk.yellow(`[MAINBOT ${phone}] ⏳ Reconexión ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} en 3s...`))
          setTimeout(() => {
            mainBot({ m: { sender: phone + '@s.whatsapp.net' }, client: sock, phone, chatId: phone + '@s.whatsapp.net', onSuccess: null, onError: null, joinGroup: false, isAutoReconnect: true });
          }, 3000);
        }
      }
    }
  })

  return sock
}

export function initializeMainBotManager(mainSock, config) {
    console.log(chalk.cyan('[MAIN MANAGER] Iniciado'));
}

export function getMainBotStatus() {
    return { total: global.mainBots.length, active: global.mainBots.length }
}

export default { mainBot, initializeMainBotManager, getMainBotStatus }
