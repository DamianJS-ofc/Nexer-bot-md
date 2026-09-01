import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{})

export default {
  name: 'bots',
  alias: ['subbots', 'listbots'],
  category: 'Utiles',

  async execute(sock, msg, options) {
    const { config, replyWithContext, senderJid } = options
    const from = msg.key.remoteJid

    try {
      await react(sock, msg, '🤖')

      const sessionsPath = path.join(process.cwd(), "Sessions", "Subs")
      const prefixPath = path.join(process.cwd(), "prefixes.json")

      if (!fs.existsSync(sessionsPath)) {
        await react(sock, msg, '⚠️')
        return replyWithContext(`⚠️ No hay subbots vinculados`, [senderJid])
      }

      const subDirs = fs.readdirSync(sessionsPath).filter(d => {
        const full = path.join(sessionsPath, d)
        return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'creds.json'))
      })

      if (subDirs.length === 0) {
        await react(sock, msg, '⚠️')
        return replyWithContext(`⚠️ No hay subbots conectados`, [senderJid])
      }

      let dataPrefijos = {}
      if (fs.existsSync(prefixPath)) {
        try { dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, 'utf-8')) } catch {}
      }

      let activosReales = 0
      try { activosReales = global.conns?.filter(c => c.user)?.length || 0 } catch {}

      const total = subDirs.length
      const maxSubbots = 30
      const disponibles = maxSubbots - total

      const lista = subDirs.map((dir, i) => {
        const jid = dir.replace(/\D/g, '')
        const fullJid = `${jid}@s.whatsapp.net`
        const prefijo = dataPrefijos[fullJid] || config.prefix || "."
        const estaOnline = global.conns?.some(c => c.user?.id?.includes(jid))
        const estado = estaOnline? "🟢 Online" : "🟡 Guardado"
        const sensurado = `+${jid.slice(0, 3)}*****${jid.slice(-2)}`
        return `╭➤ *Subbot ${i + 1}* ${estado}\n│ Número: ${sensurado}\n│ Prefijo: *${prefijo}*\n╰───────────────`
      })

      const text = `╭━〔 *${config.name || 'NEXER'} • SUBBOTS* 〕━⬣\n│ 🤖 Total: *${total}/${maxSubbots}*\n│ 🟢 Activos: *${activosReales}*\n│ 🔓 Libres: *${disponibles}*\n╰━━━━━━━━━━━━⬣\n\n${lista.join("\n\n")}`

      await sock.sendMessage(from, { text }, { quoted: msg })
      await react(sock, msg, '✅')

    } catch (e) {
      console.error('bots:', e)
      await react(sock, msg, '❌')
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid])
    }
  }
}