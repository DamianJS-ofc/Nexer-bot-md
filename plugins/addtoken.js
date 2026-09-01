import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const CODES_FILE = path.join(__dirname, '..', 'databases', 'codes.json');
const loadCodes = () => { try { return fs.existsSync(CODES_FILE)? JSON.parse(fs.readFileSync(CODES_FILE,'utf8')) : {}; } catch { return {}; } };
const saveCodes = (db) => { try { fs.mkdirSync(path.dirname(CODES_FILE),{recursive:true}); fs.writeFileSync(CODES_FILE, JSON.stringify(db,null,2)); return true; } catch { return false; } };
const genCode = () => { const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; return Array.from({length:7},()=>c[Math.floor(Math.random()*c.length)]).join(''); };
const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});
const EMOJIS = { coins:'💰', oro:'🪙', diamantes:'💎' };
export default {
  name: 'addtoken', alias: ['crearcode','addcode'], category: 'Owner',
  async execute(sock, msg, options) {
    const { config, senderNumber, senderJid, args, replyWithContext, isOwner } = options;
    if (!isOwner) { await react(sock, msg, '📛'); return replyWithContext(`📛 Este comando es solo para owner`, [senderJid]); }
    if (!args.length) { await react(sock, msg, '🎫'); return replyWithContext(`*CREAR CÓDIGO*\n> ${config.prefix}addtoken oro / 50000`, [senderJid]); }
    const rewards = {}; args.join(' ').split('\n').forEach(l=>{ const m=l.match(/([a-z_]+)\s*\/\s*(\d+)/i); if(m) rewards[m[1].toLowerCase()] = parseInt(m[2]); });
    if (!Object.keys(rewards).length) return replyWithContext(`❓ Formato inválido`, [senderJid]);
    const codes = loadCodes(); let code; do { code=genCode(); } while(codes[code]);
    codes[code] = { code, rewards, createdAt: Date.now(), expiresAt: Date.now()+4*60*60*1000, usedBy: [] }; saveCodes(codes);
    await react(sock, msg, '✅'); return replyWithContext(`*CÓDIGO:* \`${code}\`\n> Canjea: ${config.prefix}canjear ${code}`, [senderJid]);
  }
};