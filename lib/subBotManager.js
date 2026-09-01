import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { startSubBot } from './startSubBot.js'

let globalMainClient = null;
let globalConfig = null;

export function initializeSubBotManager(mainClient, config) {
  globalMainClient = mainClient;
  globalConfig = config;
  console.log(chalk.green('[AUTO-RECONEXION] ✅ Sistema NEXER inicializado'));
  setTimeout(() => autoReconnectAllSubBots(), 3000);
}

async function autoReconnectAllSubBots() {
  console.log(chalk.cyan('[AUTO-RECONEXION SUBS] 🔄 Buscando sub-bots...'));
  const sessionsDir = './Sessions/Subs';
  if (!fs.existsSync(sessionsDir)) {
    console.log(chalk.yellow('[AUTO-RECONEXION SUBS] 📁 No hay carpeta Subs/'));
    return;
  }

  try {
    const folders = fs.readdirSync(sessionsDir);
    console.log(chalk.cyan(`[AUTO-RECONEXION SUBS] 📂 ${folders.length} sesiones encontradas`));
    let reconnectedCount = 0;

    for (const folder of folders) {
      const sessionPath = path.join(sessionsDir, folder);
      try {
        if (!fs.statSync(sessionPath).isDirectory()) continue;
      } catch { continue }

      const credsPath = path.join(sessionPath, 'creds.json');
      if (!fs.existsSync(credsPath)) continue;

      try {
        console.log(chalk.cyan(`[AUTO-RECONEXION SUBS] ⚡ Reconectando: ${folder}`));
        const mockMessage = {
          key: { remoteJid: 'auto-reconnect@system', fromMe: true },
          sender: `${folder}@s.whatsapp.net`
        };

        await startSubBot({
          m: mockMessage,
          client: globalMainClient,
          phone: folder,
          chatId: 'auto-reconnect@system',
          caption: '',
          joinGroup: false, // NEXER no entra a grupo auto
          onSuccess: (num) => {
            reconnectedCount++;
            console.log(chalk.green(`[AUTO-RECONEXION SUBS] ✅ ${num}`));
          },
          onError: (error) => {
            const msg = (error.message || String(error)).toLowerCase();
            console.log(chalk.yellow(`[AUTO-RECONEXION SUBS] ⚠️ ${folder}: ${msg}`));
            if (msg.includes('403') || msg.includes('440') || msg.includes('401') || msg.includes('logged out') || msg.includes('creds') || msg.includes('invalid')) {
              cleanupInvalidSession(folder);
            }
          }
        });
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('403') || msg.includes('440') || msg.includes('401')) cleanupInvalidSession(folder);
      }
    }
    console.log(chalk.green(`[AUTO-RECONEXION SUBS] 🎯 ${reconnectedCount}/${folders.length} reconectados`));
  } catch (error) {
    console.log(chalk.red('[AUTO-RECONEXION SUBS] ❌ Error:', error.message));
  }
}

function cleanupInvalidSession(phoneNumber) {
  const sessionDir = path.join('./Sessions/Subs', phoneNumber);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(chalk.red(`[AUTO-RECONEXION] 🗑️ Sesión eliminada: ${phoneNumber}`));
    }
  } catch (error) {
    console.log(chalk.red(`[AUTO-RECONEXION] ❌ Error borrando ${phoneNumber}:`, error.message));
  }
}

export function getConnectionStatus() {
  const subsDir = './Sessions/Subs';
  let totalSubs = 0, activeSubs = 0;
  if (fs.existsSync(subsDir)) {
    try {
      const folders = fs.readdirSync(subsDir);
      totalSubs = folders.length;
      activeSubs = folders.filter(f => fs.existsSync(path.join(subsDir, f, 'creds.json'))).length;
    } catch {}
  }
  return { total: totalSubs, active: activeSubs, subs: { total: totalSubs, active: activeSubs } };
}