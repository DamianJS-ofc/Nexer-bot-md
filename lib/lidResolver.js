import fs from 'fs'
const LID_CACHE_PATH = './databases/lidCache.json'
let cache = new Map()

try {
  if (fs.existsSync(LID_CACHE_PATH)) {
    const data = JSON.parse(fs.readFileSync(LID_CACHE_PATH, 'utf8'))
    cache = new Map(Object.entries(data))
  }
} catch {}

function saveCache() {
  try {
    if (!fs.existsSync('./databases')) fs.mkdirSync('./databases', { recursive: true })
    fs.writeFileSync(LID_CACHE_PATH, JSON.stringify(Object.fromEntries(cache), null, 2))
  } catch {}
}

export function getIdFromLid(lid) {
  if (!lid) return null
  const lidStr = String(lid)
  if (!lidStr.includes('lid')) return lidStr.includes('@')? lidStr : lidStr + '@s.whatsapp.net'
  return cache.get(lidStr) || cache.get(lidStr.split('@')[0]) || null
}

export function saveLidMapping(lid, jid) {
  if (!lid ||!jid) return
  // acepta 549...@s.whatsapp.net o 549...@lid o solo numero
  const jidStr = String(jid)
  if (!jidStr.includes('@s.whatsapp.net') &&!/^\d+$/.test(jidStr.split('@')[0])) return

  const lidKey = String(lid).includes('@')? String(lid) : `${lid}@lid`
  const lidShort = String(lid).split('@')[0]
  const finalJid = jidStr.includes('@')? jidStr : `${jidStr}@s.whatsapp.net`

  if (!cache.has(lidKey)) {
    cache.set(lidKey, finalJid)
    cache.set(lidShort, finalJid)
    saveCache()
    console.log(`[LID] 🔗 ${lidKey} -> ${finalJid}`)
  }
}

export function resolveJid(jid) {
  if (!jid) return jid
  if (String(jid).endsWith('@lid')) return getIdFromLid(jid) || jid
  return jid
}

console.log(`✅ lidResolver: ${cache.size} mapeos cargados`)
