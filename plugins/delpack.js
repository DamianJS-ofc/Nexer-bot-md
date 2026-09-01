import fs from 'fs';
import path from 'path';

const PACKS_FILE = path.join(process.cwd(), 'databases', 'packs.json');
const load = () => fs.existsSync(PACKS_FILE)? JSON.parse(fs.readFileSync(PACKS_FILE,'utf8')) : {};
const save = (db) => fs.writeFileSync(PACKS_FILE, JSON.stringify(db,null,2));

const react = (sock, msg, emoji) => sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(()=>{});

export default {
  name: 'delpack',
  alias: ['removepack'],
  category: 'Stickers',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, senderNumber, args, config } = options;

    const name = args.join(' ').trim();
    if(!name){
      await react(sock, msg, '❓');
      return replyWithContext(`✳️ Pon nombre del pack\n> Ej: \`${config.prefix}delpack Mis Stickers\``, [senderJid]);
    }

    const db = load();
    if(!db[senderNumber]?.packs?.length){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No tienes packs\n> Crea uno con \`${config.prefix}addpack\``, [senderJid]);
    }

    const idx = db[senderNumber].packs.findIndex(p=> p.name.toLowerCase() === name.toLowerCase());
    if(idx === -1){
      await react(sock, msg, '❌');
      return replyWithContext(`❌ No tienes pack llamado "${name}"\n> Usa \`${config.prefix}packlist\``, [senderJid]);
    }

    db[senderNumber].packs.splice(idx,1);
    if(!db[senderNumber].packs.length) delete db[senderNumber];
    save(db);

    await react(sock, msg, '🗑️');
    return replyWithContext(`✅ Pack *${name}* eliminado`, [senderJid]);
  }
};