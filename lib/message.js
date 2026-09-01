import { jidDecode } from 'infinity'
import { saveLidMapping, getIdFromLid, resolveJid } from './lidResolver.js'

export async function smsg(sock, m) {
  if (!m) return m
  const M = m
  const msg = M.message || {}

  // Guardar LID automáticamente
  try {
    const pn = M.key?.participantAlt || M.key?.senderPn || M.participantAlt
    const lid = M.key?.participant || M.participant || M.key?.senderLid
    if (pn && lid && String(lid).includes('@lid')) saveLidMapping(lid, pn)
    // también en quoted
    const qPn = msg?.extendedTextMessage?.contextInfo?.participantAlt
    const qLid = msg?.extendedTextMessage?.contextInfo?.participant
    if (qPn && qLid && String(qLid).includes('@lid')) saveLidMapping(qLid, qPn)
  } catch {}

  const type = Object.keys(msg)[0]
  M.type = type

  M.body =
    msg.conversation ||
    msg[type]?.text ||
    msg[type]?.caption ||
    msg[type]?.contentText ||
    ''

  M.id = M.key?.id
  M.chat = M.key?.remoteJid
  M.fromMe = M.key?.fromMe
  M.isGroup = M.chat?.endsWith('@g.us')

  const getCleanNumber = (jid) => {
    if (!jid) return null
    let realJid = jid
    if (String(jid).endsWith('@lid')) {
        realJid = getIdFromLid(jid) || M.key?.participantAlt || M.key?.senderPn || jid
    }
    if (String(realJid).endsWith('@lid')) {
        realJid = getIdFromLid(realJid) || realJid
    }
    return String(realJid).replace('@s.whatsapp.net', '').replace(/:\d+/, '').split('@')[0]
  }

  // Sender con LID fix
  if (M.fromMe) {
    M.sender = sock.user.id
  } else if (M.isGroup) {
    if (M.key?.participantAlt) M.sender = M.key.participantAlt
    else if (M.key?.senderPn) M.sender = M.key.senderPn
    else if (M.key?.participant) M.sender = resolveJid(M.key.participant)
    else M.sender = M.key?.participant || M.chat
  } else {
    if (M.key?.senderPn) M.sender = M.key.senderPn
    else M.sender = resolveJid(M.chat) || M.chat
  }

  M.senderNumber = getCleanNumber(M.sender)
  M.senderJid = M.sender.includes('@')? M.sender : `${M.sender}@s.whatsapp.net`

  M.pushName = M.pushName || M.name || 'Sin nombre'

  // Menciones con LID resuelto
  let mentioned = msg[type]?.contextInfo?.mentionedJid || []
  M.mentionedJid = mentioned.map(j => resolveJid(j) || j)

  // Quoted
  const quoted = msg[type]?.contextInfo?.quotedMessage
  if (quoted) {
    const qType = Object.keys(quoted)[0]
    let qSender = msg[type].contextInfo.participant
    // resolver LID del quoted
    if (String(qSender).endsWith('@lid')) {
        const alt = msg[type].contextInfo?.participantAlt
        if (alt) { saveLidMapping(qSender, alt); qSender = alt }
        else qSender = getIdFromLid(qSender) || qSender
    }
    M.quoted = {
      type: qType,
      id: msg[type].contextInfo.stanzaId,
      sender: qSender,
      text: quoted[qType]?.text || quoted[qType]?.caption || '',
      message: quoted
    }
    M.quoted.senderNumber = getCleanNumber(M.quoted.sender)
    M.quoted.delete = () =>
      sock.sendMessage(M.chat, {
        delete: { remoteJid: M.chat, fromMe: false, id: M.quoted.id, participant: M.quoted.sender }
      })
  } else {
    M.quoted = null
  }

  M.reply = (text, options = {}) =>
    sock.sendMessage(M.chat, { text,...options }, { quoted: M })

  M.react = emoji =>
    sock.sendMessage(M.chat, { react: { text: emoji, key: M.key } })

  M.decodeJid = jid => {
    if (!jid) return jid
    const resolved = resolveJid(jid)
    if (resolved!== jid) return resolved
    if (/:\d+@/.test(jid)) {
      const d = jidDecode(jid) || {}
      return d.user && d.server? `${d.user}@${d.server}` : jid
    }
    return jid
  }

  return M
}

export default { smsg }