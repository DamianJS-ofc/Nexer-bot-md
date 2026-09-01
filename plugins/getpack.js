import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});
const loadDB = () => {
  try{
    if(fs.existsSync(PACKS_FILE)) return JSON.parse(fs.readFileSync(PACKS_FILE,'utf8'));
  }catch{}
  return {};
};

export default {
  name: 'getpack',
  alias: ['verpack'],
  category: 'Stickers',

  async execute(sock, msg, options){
    try{
      const { args, senderNumber, senderJid, replyWithContext, config } = options;
      const from = msg.key.remoteJid;

      const packName = args.join(' ').trim().toLowerCase();
      if(!packName){
        await react(sock,msg,'✳️');
        return replyWithContext(`✳️ Uso: ${config.prefix}getpack <nombre>`, [senderJid]);
      }

      const db = loadDB();
      const userPacks = db[senderNumber]?.packs;
      if(!userPacks?.length){
        await react(sock,msg,'📦');
        return replyWithContext(`📦 No tienes packs. Usa ${config.prefix}newpack`, [senderJid]);
      }

      const pack = userPacks.find(p=> p.name.toLowerCase()===packName);
      if(!pack){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Pack "${packName}" no encontrado. Usa ${config.prefix}packlist`, [senderJid]);
      }

      if(!pack.stickers || pack.stickers.length < 4){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Pack "${pack.name}" necesita minimo 4 stickers`, [senderJid]);
      }

      const valid = pack.stickers.map(s=>{
        try{ return Buffer.from(s.buffer,'base64'); }catch{ return null; }
      }).filter(b=> b && b.length>0);

      if(valid.length < 4){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Stickers corruptos en pack "${pack.name}"`, [senderJid]);
      }

      await react(sock,msg,'📦');
      await sock.sendPresenceUpdate('composing', from);

      const selected = valid.slice(0,50);
      const cover = selected[0];

      let webp;
      try{ webp = await import('node-webpmux'); }catch{}

      const stickerResults = await Promise.all(selected.map(async buf=>{
        if(!webp) return { sticker: buf, emojis:['✨'] };
        try{
          const img = new webp.default.Image();
          await img.load(buf);
          const json = {
            'sticker-pack-id': 'github.com',
            'sticker-pack-name': pack.name,
            'sticker-pack-publisher': pack.author || senderNumber,
            emojis:['✨']
          };
          const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
          const jb = Buffer.from(JSON.stringify(json),'utf8');
          const exif = Buffer.concat([exifAttr, jb]);
          exif.writeUIntLE(jb.length,14,4);
          img.exif = exif;
          const tmp = `./temp/pack-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
          await img.save(tmp);
          const out = fs.readFileSync(tmp);
          fs.unlinkSync(tmp);
          return { sticker: out, emojis:['✨'] };
        }catch{
          return { sticker: buf, emojis:['✨'] };
        }
      }));

      await sock.sendMessage(from, {
        stickerPack: {
          name: pack.name,
          publisher: pack.author || 'Bot',
          description: pack.desc || '',
          cover,
          stickers: stickerResults
        }
      }, {quoted: msg});

      await react(sock,msg,'✅');

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};