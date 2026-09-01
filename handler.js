import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGroupsConfig, saveGroupsConfig, getGroupConfig, updateGroupConfig } from './lib/groupConfig.js';
import { getIdFromLid, saveLidMapping, resolveJid } from './lib/lidResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'databases', 'users.json');
const LEVEL_FILE = path.join(__dirname, 'databases', 'level.json');
const WARNS_FILE = path.join(__dirname, 'databases', 'warns.json');
const PRIMARIOS_FILE = path.join(__dirname, 'databases', 'primarios.json');
const PRIVADO_FILE = path.join(__dirname, 'databases', 'privado.json');

function extractNumberFromJid(jid) {
    if (!jid) return null;
    if (String(jid).includes('@lid')) {
        const resolved = getIdFromLid(jid);
        if (resolved) jid = resolved;
        else return String(jid).split('@')[0].replace(/\D/g, '') || null;
    }
    return String(jid).split('@')[0].replace(/\D/g, '') || null;
}
function getSenderNumber(msg) {
    if (msg.key?.participantAlt) return extractNumberFromJid(msg.key.participantAlt);
    if (msg.participantAlt) return extractNumberFromJid(msg.participantAlt);
    if (msg.key?.senderPn) return extractNumberFromJid(msg.key.senderPn);
    if (msg.key?.participant) return extractNumberFromJid(msg.key.participant);
    if (msg.participant) return extractNumberFromJid(msg.participant);
    if (msg.key?.remoteJid) return extractNumberFromJid(msg.key.remoteJid);
    return null;
}
function getBotNumber(sock) {
    if (sock.phoneNumber) return sock.phoneNumber.replace(/\D/g, '');
    if (sock.user?.id) return extractNumberFromJid(sock.user.id);
    return null;
}
function getSenderLid(msg) {
    const alt = msg.key?.participantAlt || msg.participantAlt || msg.key?.senderPn;
    const lid = msg.key?.participant || msg.participant || msg.key?.senderLid;
    if (alt && lid && String(lid).includes('@lid')) saveLidMapping(lid, alt);
    if (lid && String(lid).includes('@lid')) return lid;
    return null;
}
function getSenderJidForMention(msg) {
    if (msg.key?.participantAlt) return msg.key.participantAlt;
    if (msg.participantAlt) return msg.participantAlt;
    if (msg.key?.senderPn) return msg.key.senderPn;
    if (msg.key?.participant) return resolveJid(msg.key.participant);
    if (msg.participant) return resolveJid(msg.participant);
    return msg.key?.remoteJid || null;
}
function getNumberFromLid(usersDB, lid) {
    if (!lid) return null;
    const resolved = getIdFromLid(lid);
    if (resolved) return extractNumberFromJid(resolved);
    const lidNumber = String(lid).split('@')[0];
    if (usersDB[lidNumber]) return lidNumber;
    for (const [number, userData] of Object.entries(usersDB)) {
        if (userData.lid === lid) return number;
    }
    return lidNumber;
}
async function getBotConfig(sock, defaultConfig) {
    try {
        let botNumber = '';
        if (sock.phoneNumber) botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
        else if (sock.user?.id) botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        if (!botNumber) return defaultConfig;
        const configPath = path.join(process.cwd(), 'info', botNumber, 'config.js');
        if (fs.existsSync(configPath)) {
            const mod = await import(`file://${configPath}?v=${Date.now()}`);
            const infoConfig = mod.default || mod;
            if (infoConfig) return {...defaultConfig,...infoConfig};
        }
        return defaultConfig;
    } catch { return defaultConfig; }
}
const initFiles = () => {
    if (!fs.existsSync(path.join(__dirname, 'databases'))) fs.mkdirSync(path.join(__dirname, 'databases'), { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}', 'utf8');
    if (!fs.existsSync(LEVEL_FILE)) fs.writeFileSync(LEVEL_FILE, '{}', 'utf8');
    if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, '{}', 'utf8');
    if (!fs.existsSync(PRIMARIOS_FILE)) fs.writeFileSync(PRIMARIOS_FILE, '{}', 'utf8');
    if (!fs.existsSync(PRIVADO_FILE)) fs.writeFileSync(PRIVADO_FILE, JSON.stringify({ enabled: true }, null, 2), 'utf8');
};
const loadUsersDB = () => { try { return fs.existsSync(USERS_FILE)? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : {}; } catch { return {}; } };
const saveUsersDB = (db) => { try { fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf8'); return true; } catch { return false; } };
const registerUser = (usersDB, userNumber, userLid, userJidForMention, pushName) => {
    if (!userNumber) return { isNew: false, user: null };
    try {
        if (!usersDB[userNumber]) {
            usersDB[userNumber] = { number: userNumber, lid: userLid, jid: userJidForMention, name: pushName || userNumber, pushName: pushName || userNumber, registered: new Date().toISOString(), lastSeen: Date.now(), lastLid: userLid, lastJid: userJidForMention, firstCommand: null, groups: [] };
            console.log(`⭐ Nuevo usuario: ${pushName} (${userNumber})`);
            return { isNew: true, user: usersDB[userNumber] };
        } else {
            if (userLid) usersDB[userNumber].lid = userLid;
            if (userJidForMention) usersDB[userNumber].jid = userJidForMention;
            if (pushName && pushName!== 'Usuario') usersDB[userNumber].pushName = pushName;
            usersDB[userNumber].lastSeen = Date.now();
            return { isNew: false, user: usersDB[userNumber] };
        }
    } catch { return { isNew: false, user: null }; }
};
const getUserJidForMention = (usersDB, userNumber) => {
    if (!userNumber ||!usersDB[userNumber]) return null;
    return resolveJid(usersDB[userNumber].jid || usersDB[userNumber].lid) || null;
};
const loadLevelDB = () => { try { return fs.existsSync(LEVEL_FILE)? JSON.parse(fs.readFileSync(LEVEL_FILE, 'utf8')) : {}; } catch { return {}; } };
const saveLevelDB = (db) => { try { fs.writeFileSync(LEVEL_FILE, JSON.stringify(db, null, 2), 'utf8'); return true; } catch { return false; } };
const calculateExpForLevel = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
const calculateLevel = (exp) => { let level = 1, expNeeded = 100, currentExp = exp; while (currentExp >= expNeeded) { currentExp -= expNeeded; level++; expNeeded = calculateExpForLevel(level); } return { level, currentExp, expNeeded, totalExp: exp }; };
const addCommandExp = (userNumber, commandName) => {
    try {
        if (!userNumber) return { success: false };
        const levelDB = loadLevelDB();
        if (!levelDB[userNumber]) levelDB[userNumber] = { number: userNumber, exp: 0, level: 1, commands: 0, lastCommand: null };
        levelDB[userNumber].exp += 15; levelDB[userNumber].commands += 1;
        levelDB[userNumber].lastCommand = { name: commandName, timestamp: Date.now() };
        const newLevelData = calculateLevel(levelDB[userNumber].exp);
        const oldLevel = levelDB[userNumber].level;
        levelDB[userNumber].level = newLevelData.level;
        saveLevelDB(levelDB);
        return { success: true, newLevel: newLevelData.level, oldLevel, exp: levelDB[userNumber].exp, commands: levelDB[userNumber].commands, leveledUp: newLevelData.level > oldLevel };
    } catch { return { success: false }; }
};
const getUserLevelInfo = (userNumber) => {
    try {
        if (!userNumber) return { exists: false, level: 1, currentExp: 0, expNeeded: 100, totalExp: 0, commands: 0 };
        const levelDB = loadLevelDB();
        if (!levelDB[userNumber]) return { exists: false, level: 1, currentExp: 0, expNeeded: 100, totalExp: 0, commands: 0 };
        const levelData = calculateLevel(levelDB[userNumber].exp || 0);
        return { exists: true, level: levelData.level, currentExp: levelData.currentExp, expNeeded: levelData.expNeeded, totalExp: levelData.totalExp, commands: levelDB[userNumber].commands || 0, lastCommand: levelDB[userNumber].lastCommand || null };
    } catch { return { exists: false, level: 1, currentExp: 0, expNeeded: 100, totalExp: 0, commands: 0 }; }
};
const loadWarnsDB = () => { try { return fs.existsSync(WARNS_FILE)? JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8')) : {}; } catch { return {}; } };
const saveWarnsDB = (w) => { try { fs.writeFileSync(WARNS_FILE, JSON.stringify(w, null, 2), 'utf8'); return true; } catch { return false; } };
const addWarn = (userNumber, adminNumber, reason, groupId) => { try { const db = loadWarnsDB(); if (!db[groupId]) db[groupId] = {}; if (!db[groupId][userNumber]) db[groupId][userNumber] = []; const nw = { id: db[groupId][userNumber].length + 1, reason, date: new Date().toLocaleString('es-ES'), timestamp: Date.now(), warner: adminNumber }; db[groupId][userNumber].push(nw); saveWarnsDB(db); return nw; } catch { return null; } };
const getWarns = (userNumber, groupId) => { try { const db = loadWarnsDB(); return db[groupId]?.[userNumber] || []; } catch { return []; } };
const removeWarn = (userNumber, groupId, warnId) => { try { const db = loadWarnsDB(); if (db[groupId]?.[userNumber]) { const l = db[groupId][userNumber].length; db[groupId][userNumber] = db[groupId][userNumber].filter(w => w.id!== warnId).map((w, i) => ({...w, id: i + 1})); saveWarnsDB(db); return db[groupId][userNumber].length < l; } return false; } catch { return false; } };
const clearWarns = (userNumber, groupId) => { try { const db = loadWarnsDB(); if (db[groupId]?.[userNumber]) { delete db[groupId][userNumber]; saveWarnsDB(db); return true; } return false; } catch { return false; } };
async function isUserAdmin(sock, groupId, userJid) {
    try {
        const realJid = resolveJid(userJid);
        const meta = await sock.groupMetadata(groupId);
        const participant = meta.participants.find(p => p.id === realJid || p.id === userJid || resolveJid(p.id) === realJid);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch { return false; }
}
const replyWithContext = async (sock, msg, text, mentions = [], config) => {
    try {
        const resolvedMentions = mentions.map(j => resolveJid(j)).filter(Boolean);
        const channelId = config.channel?.id || '120363425415754278@newsletter';
        const channelName = config.channel?.name || '𝙉𝙀𝙓𝙀𝙍 𝘽𝙊𝙏 𝙈𝘿';
        await sock.sendMessage(msg.key.remoteJid, {
            text,
            mentions: resolvedMentions,
            contextInfo: {
                mentionedJid: resolvedMentions,
                forwardingScore: 9999999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelId,
                    serverMessageId: 0,
                    newsletterName: channelName
                }
            }
        }, { quoted: msg });
        return true;
    } catch (e) { console.error('Error reply:', e.message); return false; }
};
const getTotalCommandsUsed = () => { try { const db = loadLevelDB(); let t = 0; Object.values(db).forEach(u => t += u.commands || 0); return t; } catch { return 0; } };
const getTotalPlugins = () => { try { const dir = path.join(__dirname, 'plugins'); return fs.existsSync(dir)? fs.readdirSync(dir).filter(f => f.endsWith('.js')).length : 0; } catch { return 0; } };
const getTotalRegistros = () => { try { return Object.keys(loadUsersDB()).length; } catch { return 0; } };

initFiles();
const handler = async (sock, msg, plugins, defaultConfig) => {
    try {
        const config = await getBotConfig(sock, defaultConfig);
        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'Usuario';

        try {
            const pn = msg.key?.participantAlt || msg.key?.senderPn || msg.participantAlt;
            const lid = msg.key?.participant || msg.participant || msg.key?.senderLid;
            if (pn && lid) saveLidMapping(lid, pn);
        } catch {}

        const senderNumber = getSenderNumber(msg);
        const senderLid = getSenderLid(msg);
        const senderJidForMention = getSenderJidForMention(msg);
        const isBotSelf = msg.key.fromMe;

        let body = '';
        if (msg.message?.conversation) body = msg.message.conversation;
        else if (msg.message?.extendedTextMessage?.text) body = msg.message.extendedTextMessage.text;
        else if (msg.message?.imageMessage?.caption) body = msg.message.imageMessage.caption || '';
        else if (msg.message?.videoMessage?.caption) body = msg.message.videoMessage.caption || '';
        else if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try { body = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id || ''; } catch { body = ''; }
        } else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        else if (msg.message?.buttonsResponseMessage?.selectedButtonId) body = msg.message.buttonsResponseMessage.selectedButtonId;
        else if (msg.message?.templateButtonReplyMessage?.selectedId) body = msg.message.templateButtonReplyMessage.selectedId;

        const isCommand = body.startsWith(config.prefix);
        if (!isCommand) return;

        // PRIVADO ON/OFF
        if (!from.endsWith('@g.us')) {
            let privadoConfig = { enabled: true };
            try { if (fs.existsSync(PRIVADO_FILE)) privadoConfig = JSON.parse(fs.readFileSync(PRIVADO_FILE, 'utf8')); } catch {}
            const argsP = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdNameP = argsP[0]?.toLowerCase() || '';
            const pluginP = plugins.get(cmdNameP);
            if (!privadoConfig.enabled) {
                if (!pluginP) {
                    await replyWithContext(sock, msg, `✳️ El Comando \`${config.prefix}${cmdNameP}\` No Existe.\n> ➤ Usa ${config.prefix}menu`, [], config);
                }
                return;
            }
        }

        let usersDB = loadUsersDB();
        if (senderNumber) {
            const reg = registerUser(usersDB, senderNumber, senderLid, senderJidForMention, pushName);
            if (reg.isNew || senderLid) saveUsersDB(usersDB);
        }

        if (senderNumber && usersDB[senderNumber]?.banned?.isBanned) {
            console.log(`🚫 Baneado: ${senderNumber}`);
            return;
        }

        if (from.endsWith('@g.us')) {
            try {
                let primariosDB = fs.existsSync(PRIMARIOS_FILE)? JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8')) : {};
                if (primariosDB[from]) {
                    let cur = sock.user?.id? extractNumberFromJid(sock.user.id) : sock.phoneNumber || '';
                    if (!cur.replace(/\D/g,'').includes(primariosDB[from].botPhone.replace(/\D/g,''))) {
                        console.log(`🚫 No primario en ${from}`);
                        return;
                    }
                }
            } catch {}
            const groupConfig = getGroupConfig(from);
            const argsTmp = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdTmp = argsTmp[0]?.toLowerCase() || '';
            const isOwner = config.owner?.some(o => {
                const clean = o.replace(/\D/g,'');
                return clean === senderNumber?.replace(/\D/g,'') || clean === extractNumberFromJid(senderLid || '') || clean === extractNumberFromJid(getIdFromLid(senderLid) || '');
            });
            if (cmdTmp!== 'bot' && cmdTmp!== 'onlyadmin' && cmdTmp!== 'privado') {
                if (!groupConfig.botEnabled &&!isOwner) {
                    await sock.sendMessage(from, { text: `📛 ${config.name} está apagado.\n> Activa con ${config.prefix}bot on` }, { quoted: msg });
                    return;
                }
                if (groupConfig.onlyadmin) {
                    const jidCheck = resolveJid(senderJidForMention || senderLid);
                    const isAdmin = jidCheck? await isUserAdmin(sock, from, jidCheck) : false;
                    if (!isAdmin &&!isOwner) {
                        console.log(`🔒 No admin: ${senderNumber || senderLid}`);
                        return;
                    }
                }
            }
        }

        const args = body.slice(config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const plugin = plugins.get(cmdName);

        // ✅ COMANDO NO EXISTE - CON CONTEXT Y MENCION
        if (!plugin) {
            saveUsersDB(usersDB);
            let mentionJid = resolveJid(senderJidForMention || senderLid);
            await replyWithContext(sock, msg, `✳️ El Comando \`${config.prefix}${cmdName}\` No Existe.\n> ➤ Usa ${config.prefix}menu`, mentionJid? [mentionJid] : [], config);
            return;
        }

        let expResult = { success: true };
        if (!isBotSelf && senderNumber) expResult = addCommandExp(senderNumber, cmdName);
        saveUsersDB(usersDB);
        const levelInfo = senderNumber? getUserLevelInfo(senderNumber) : { exists: false, level: 1, commands: 0 };

        await plugin.execute(sock, msg, {
            args, command: cmdName, body, config, usersDB, levelInfo, pushName,
            sender: isBotSelf? (getBotNumber(sock) || senderLid) : (senderNumber || senderLid),
            senderNumber: isBotSelf? getBotNumber(sock) : senderNumber,
            senderLid, senderJid: resolveJid(senderJidForMention), expResult, isBotSelf,
            replyWithContext: (t, m=[]) => replyWithContext(sock, msg, t, m, config),
            getTotalCommandsUsed, getTotalPlugins, getTotalRegistros, calculateLevel,
            addWarn, getWarns, removeWarn, clearWarns,
            getGroupConfig, updateGroupConfig, extractNumberFromJid, getSenderNumber, getSenderLid,
            getUserJidForMention, getNumberFromLid: (lid) => getNumberFromLid(usersDB, lid),
            resolveJid, getIdFromLid, saveLidMapping, isUserAdmin, getBotNumber: () => getBotNumber(sock)
        });

    } catch (e) { console.error('🔥 Error en handler:', e); }
};

export default handler;
export { loadUsersDB, saveUsersDB, loadLevelDB, saveLevelDB, calculateExpForLevel, calculateLevel, addCommandExp, getUserLevelInfo, registerUser, replyWithContext, getTotalCommandsUsed, getTotalPlugins, getTotalRegistros, loadWarnsDB, saveWarnsDB, addWarn, getWarns, removeWarn, clearWarns, isUserAdmin, getGroupConfig, updateGroupConfig, extractNumberFromJid, getSenderNumber, getSenderLid, getSenderJidForMention, getUserJidForMention, getNumberFromLid, getBotConfig, getBotNumber };
