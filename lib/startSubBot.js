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
import { createInfoFolder } from '../utils/createInfoFolder.js'
import { saveLidMapping, getIdFromLid } from './lidResolver.js'

if (!global.conns) global.conns = []
if (!global.subBots) global.subBots = []

const cleanJid = jid => jid?.replace(/:\d+/, '').split('@')[0]
const silentLogger = { level: 'silent', child: () => silentLogger, trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {} }

function loadBotConfig(phone) {
  try {
    const p = path.join(process.cwd(), 'info', phone, 'config.js');
    if (fs.existsSync(p)) {
      const c = fs.readFileSync(p, 'utf8');
      const m = c.match(/export default\s+({[\s\S]*})/);
      if (m && m[1]) return eval('(' + m[1] + ')');
    }
  } catch {}
  return null;
}

function deleteSubBotSession(phone) {
  try {
    const dir = path.join(process.cwd(), 'Sessions', 'Subs', phone);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

const codeGeneratedMap = new Map();

export async function startSubBot({ m, client, phone, chatId, onSuccess = null, onError = null, joinGroup = false }) {
  const id = phone || cleanJid(m?.sender)
  const sessionDir = `./Sessions/Subs/${id}`
  const hasValidSession = fs.existsSync(sessionDir) && fs.existsSync(path.join(sessionDir, 'creds.json'));
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({ auth: state, version, printQRInTerminal: false, browser: Browsers.ubuntu('Chrome'), markOnlineOnConnect: true, syncFullHistory: false, logger: silentLogger })

  let qrSent = false, connectedSuccessfully = false, qrTimeout = null
  let isAutoReconnect = chatId === 'auto-reconnect@system';
  const shouldGenerateCode =!hasValidSession &&!codeGeneratedMap.get(phone);
  if (shouldGenerateCode) codeGeneratedMap.set(phone, true);

  sock.isSubBot = true; sock.phoneNumber = phone; sock.botName = 'NEXER BOT'
  sock.ev.on('creds.update', saveCreds)
  sock.decodeJid = jid => {
    if (!jid) return jid
    if (String(jid).endsWith('@lid')) { const r = getIdFromLid(jid); if (r) return r }
    if (/:\d+@/.test(jid)) { const d = jidDecode(jid); return d?.user && d?.server? `${d.user}@${d.server}` : jid }
    return jid
  }

  let subBotConfig = loadBotConfig(phone);
  if (!subBotConfig) {
    subBotConfig = {
      name: 'NEXER BOT', name1: 'NEXER BOT', name2: 'NEXER BOT MD', prefix: '.', tipo: 'owner',
      info: 'SubBot activo', version: '5.6.0',
      navegador: ['Ubuntu', 'Chrome', '110.0.0.0'], baileys: ['Edge', 'Chrome', '110.0.0.0'],
      botowner: '5492645746772', creador: 'DamianJS-ofc', owner: ['5492645746772', '5492645576493'],
      packname: 'NEXER BOT MD', author: 'DamianJS-ofc',
      channel: { id: '120363425415754278@newsletter', name: '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿', link: 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U' },
      economy: { initialCoins: 500, initialExp: 0, maxBet: 5000, minBet: 5 },
      isSubBot: true
    };
  }

  let handler = null, plugins = new Map()
  async function loadPlugins() {
    const dir = './plugins'
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') &&!f.startsWith('_'))
    for (const file of files) {
      try {
        const mod = await import(new URL(`../plugins/${file}`, import.meta.url).href + `?v=${Date.now()}`)
        if (mod.default?.name) {
          plugins.set(mod.default.name.toLowerCase(), mod.default)
          if (mod.default.alias) {
            if (Array.isArray(mod.default.alias)) mod.default.alias.forEach(a => plugins.set(a.toLowerCase(), mod.default))
            else plugins.set(mod.default.alias.toLowerCase(), mod.default)
          }
        }
      } catch (e) { console.log(chalk.red(`❌ ${file}: ${e.message}`)) }
    }
    try { handler = (await import(new URL('../handler.js', import.meta.url).href + `?v=${Date.now()}`)).default } catch {}
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]; if (!msg?.message) return
      try {
        const pn = msg.key?.participantAlt || msg.key?.senderPn || msg.participantAlt
        const lid = msg.key?.participant || msg.participant || msg.key?.senderLid
        if (pn && lid && String(lid).includes('@lid')) saveLidMapping(lid, pn)
      } catch {}
      let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || ''
      if (msg.key.fromMe &&!body.startsWith('.')) return
      if (handler) await handler(sock, msg, plugins, subBotConfig)
    } catch (e) {}
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && shouldGenerateCode &&!qrSent &&!connectedSuccessfully &&!isAutoReconnect) {
      try {
        qrSent = true; if (qrTimeout) clearTimeout(qrTimeout);
        let code = await sock.requestPairingCode(phone)
        code = code.match(/.{1,4}/g)?.join("-") || code
        console.log(chalk.green(`[SUBBOT ${phone}] Código: ${code}`))
        if (client && chatId) {
          await client.sendMessage(chatId, { text: `*${code}*`,
            footer: "© NEXER BOT MD",
            interactiveButtons: [{ name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "Copy", copy_code: code }) }]
          }, { quoted: m });
        }
        qrTimeout = setTimeout(() => { if (!connectedSuccessfully && onError) onError(new Error('Código expirado')) }, 60000)
      } catch (e) { codeGeneratedMap.delete(phone); if (onError) onError(e) }
    }
    if (connection === 'open') {
      connectedSuccessfully = true; codeGeneratedMap.delete(phone); if (qrTimeout) clearTimeout(qrTimeout);
      sock.userId = cleanJid(sock.user.id)
      if (!global.conns.find(c => c.userId === sock.userId)) global.conns.push(sock)
      if (!global.subBots.find(c => c.userId === sock.userId)) global.subBots.push(sock)
      console.log(chalk.green(`[SUBBOT ${phone}] ✅ Conectado NEXER`))
      if (onSuccess) onSuccess(sock.userId)
      await loadPlugins()
      try { createInfoFolder(phone, 'sub', subBotConfig) } catch {}
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut || code === 403 || code === 401) { deleteSubBotSession(phone); codeGeneratedMap.delete(phone); if (onError) onError(new Error(`Sesión inválida ${code}`)) }
      else if (!isAutoReconnect) setTimeout(() => startSubBot({ m, client, phone, chatId, onSuccess, onError, joinGroup }), 5000)
    }
  })
  return sock
}

export async function subBot(a) { return startSubBot(a) }
export default { startSubBot, subBot }
