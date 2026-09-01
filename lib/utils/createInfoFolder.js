import fs from 'fs'
import path from 'path'

export function createInfoFolder(phoneNumber, botType, config) {
  try {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    if (!cleanPhone) throw new Error('Número inválido')
    
    const infoPath = path.join(process.cwd(), 'info', cleanPhone)
    
    if (fs.existsSync(infoPath)) {
      console.log(`📁 INFO: ${cleanPhone} ya existe, no se sobrescribe`)
      return { success: true, path: infoPath, phone: cleanPhone, existed: true, message: 'Ya existía' }
    }
    
    console.log(`📁 Creando info para ${cleanPhone}`)
    fs.mkdirSync(infoPath, { recursive: true })
    
    // CONFIG NEXER LIMPIO SIN MESS
    const fullConfig = {
      name: config.name || 'NEXER BOT',
      name1: config.name1 || 'NEXER BOT',
      name2: config.name2 || 'NEXER BOT MD',
      prefix: config.prefix || '.',
      tipo: config.tipo || 'owner',
      info: config.info || 'Iniciando sistema...',
      version: config.version || '5.6.0',
      navegador: config.navegador || ['Ubuntu', 'Chrome', '110.0.0.0'],
      baileys: config.baileys || ['Edge', 'Chrome', '110.0.0.0'],
      sessionName: 'session',

      botowner: botType === 'sub' ? cleanPhone : (config.botowner || cleanPhone),
      creador: config.creador || 'DamianJS-ofc',
      owner: config.owner || ['5492645746772', '5492645576493'],

      packname: config.packname || 'NEXER BOT MD',
      author: config.author || 'DamianJS-ofc',
      img: config.img || 'https://raw.githubusercontent.com/JTxs00/uploads/main/1788207438786.jpeg',
      imgMenu: config.imgMenu || 'https://raw.githubusercontent.com/JTxs00/uploads/main/1788207438786.jpeg',

      channel: config.channel || {
        id: '120363425415754278@newsletter',
        name: '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿',
        link: 'https://whatsapp.com/channel/0029Vb7vqNDCsU9MnOn8UN0U'
      },

      economy: config.economy || {
        initialCoins: 500,
        initialExp: 0,
        maxBet: 5000,
        minBet: 5
      },

      // compatibilidad si viene de config vieja
      ...(config.canalId ? { canalId: config.canalId } : {}),
      ...(config.canalNombre ? { canalNombre: config.canalNombre } : {})
    }

    // Guardar sin mess
    const configContent = `// NEXER BOT MD - ${botType}
// Número: ${cleanPhone}
// Fecha: ${new Date().toLocaleString()}

export default {
    // === BOT INFO ===
    name: '${fullConfig.name}',
    name1: '${fullConfig.name1}',
    name2: '${fullConfig.name2}',
    prefix: '${fullConfig.prefix}',
    tipo: '${fullConfig.tipo}',
    info: '${fullConfig.info}',
    version: '${fullConfig.version}',
    navegador: ${JSON.stringify(fullConfig.navegador)},
    baileys: ${JSON.stringify(fullConfig.baileys)},
    sessionName: '${fullConfig.sessionName}',

    // === OWNER ===
    botowner: '${fullConfig.botowner}',
    creador: '${fullConfig.creador}',
    owner: ${JSON.stringify(fullConfig.owner)},

    // === STICKER / MEDIA ===
    packname: '${fullConfig.packname}',
    author: '${fullConfig.author}',
    img: '${fullConfig.img}',
    imgMenu: '${fullConfig.imgMenu}',

    // === CANAL - LIMPIO ===
    channel: {
      id: '${fullConfig.channel.id}',
      name: '${fullConfig.channel.name}',
      link: '${fullConfig.channel.link}'
    },

    // === ECONOMY ===
    economy: {
      initialCoins: ${fullConfig.economy.initialCoins},
      initialExp: ${fullConfig.economy.initialExp},
      maxBet: ${fullConfig.economy.maxBet},
      minBet: ${fullConfig.economy.minBet}
    }
}
`

    fs.writeFileSync(path.join(infoPath, 'config.js'), configContent)
    console.log(`📝 config.js NEXER creado para ${cleanPhone}`)
    
    // Banners
    const bannerSrc = path.join(process.cwd(), 'img', 'banner.jpg')
    if (fs.existsSync(bannerSrc)) {
      fs.copyFileSync(bannerSrc, path.join(infoPath, 'banner.jpg'))
    }
    const iconSrc = path.join(process.cwd(), 'img', 'icon.jpg')
    if (fs.existsSync(iconSrc)) {
      fs.copyFileSync(iconSrc, path.join(infoPath, 'icon.jpg'))
    }
    
    return { success: true, path: infoPath, phone: cleanPhone, created: true }
    
  } catch (error) {
    console.error(`❌ Error info:`, error.message)
    return { success: false, error: error.message }
  }
}

export function infoFolderExists(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  return fs.existsSync(path.join(process.cwd(), 'info', cleanPhone))
}

export async function getInfoConfig(phoneNumber) {
  try {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    const configPath = path.join(process.cwd(), 'info', cleanPhone, 'config.js')
    if (fs.existsSync(configPath)) {
      const mod = await import(`file://${configPath}?v=${Date.now()}`)
      return mod.default || mod
    }
    return null
  } catch { return null }
      }
