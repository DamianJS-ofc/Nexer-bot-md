import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'getcode',
  category: 'Owner',

  async execute(sock, msg, options){
    try{
      const { args, replyWithContext, senderJid, config, isOwner } = options;
      const from = msg.key.remoteJid;

      // Verifica por config / isOwner del handler, sin ID hardcodeado
      const allowed = isOwner || config?.owner?.includes(senderJid) || config?.ownerNumbers?.includes(senderJid?.split('@')[0]);
      if(!allowed){
        await react(sock,msg,'📛');
        return replyWithContext(`📛 Acceso denegado. Solo owner.`, [senderJid]);
      }

      if(!args?.length){
        await react(sock,msg,'✳️');
        return replyWithContext(`✳️ Uso: getcode <ruta>\nEj: getcode plugins/ping.js`, [senderJid]);
      }

      const fileName = args[0].trim();
      const baseDir = path.resolve(__dirname, '..');
      let filePath = fileName.includes('/')? path.join(baseDir, fileName) : null;

      if(!filePath){
        const candidates = [
          path.join(baseDir, fileName),
          path.join(baseDir, 'plugins', fileName),
          path.join(baseDir, 'lib', fileName),
          path.join(baseDir, 'utils', fileName),
          path.join(baseDir, 'handlers', fileName),
        ];
        filePath = candidates.find(p=> fs.existsSync(p) && fs.statSync(p).isFile()) || path.join(baseDir, 'plugins', fileName);
      }

      if(!fs.existsSync(filePath)){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Archivo no encontrado: ${fileName}`, [senderJid]);
      }

      const stats = fs.statSync(filePath);
      if(!stats.isFile()){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ No es un archivo valido: ${fileName}`, [senderJid]);
      }

      if(stats.size / (1024*1024) > 5){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Archivo excede 5MB`, [senderJid]);
      }

      const content = fs.readFileSync(filePath, 'utf8');

      if(content.length > 60000){
        await sock.sendMessage(from, {
          document: Buffer.from(content),
          mimetype: 'text/javascript',
          fileName: path.basename(filePath)
        }, {quoted: msg});
      }else{
        await sock.sendMessage(from, { text: content }, {quoted: msg});
      }

      await react(sock,msg,'✅');

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};