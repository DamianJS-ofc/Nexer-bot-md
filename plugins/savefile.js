import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'savefile',
  alias: [],
  category: 'Owner',

  async execute(sock, msg, options){
    try{
      const { config, senderNumber, senderJid, args, replyWithContext } = options;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      const isOwner = config.owner?.some(n => n.replace(/\D/g,'') === senderNumber?.replace(/\D/g,''));
      if(!isOwner){
        return replyWithContext(`⛔ Este comando es solo para owners`, [senderJid]);
      }

      if(!args?.length){
        return replyWithContext(
          `✳️ Uso: ${config.prefix}savefile <ruta> respondiendo a un texto\n\n`+
          `✳️ Ejemplos:\n`+
          `- ${config.prefix}savefile plugins/ping.js\n`+
          `- ${config.prefix}savefile lib/func.js`,
          [senderJid]
        );
      }

      if(!quoted){
        return replyWithContext(`❌ Debes responder a un mensaje de texto`, [senderJid]);
      }

      const type = Object.keys(quoted)[0];
      if(type!== 'conversation' && type!== 'extendedTextMessage'){
        return replyWithContext(`❌ Debes responder a un texto`, [senderJid]);
      }

      const texto = quoted.conversation || quoted.extendedTextMessage?.text || '';
      if(!texto.trim()){
        return replyWithContext(`❌ El texto esta vacio`, [senderJid]);
      }

      const fileName = args[0];
      if(fileName.includes('..')){
        return replyWithContext(`❌ Nombre no valido, no se permite '..'`, [senderJid]);
      }

      const baseDir = path.join(__dirname, '..');
      const filePath = path.join(baseDir, fileName);
      const dirPath = path.dirname(filePath);

      if(!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

      const exists = fs.existsSync(filePath);
      fs.writeFileSync(filePath, texto, 'utf8');

      const stats = fs.statSync(filePath);

      if(exists){
        return replyWithContext(
          `✅ Archivo Actualizado\n\n`+
          `✳️ Nombre: ${fileName}\n`+
          `✳️ Tamano: ${stats.size} bytes`,
          [senderJid]
        );
      }else{
        return replyWithContext(
          `✅ Archivo Creado\n\n`+
          `✳️ Nombre: ${fileName}\n`+
          `✳️ Tamano: ${stats.size} bytes\n`+
          `✳️ Ruta: ${filePath}`,
          [senderJid]
        );
      }

    }catch(e){
      const { replyWithContext, senderJid } = options;
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};
