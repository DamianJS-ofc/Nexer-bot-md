import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

export default {
  name: 'reload',
  alias: ['recargar','refresh'],
  category: 'Owner',

  async execute(sock, msg, options){
    try{
      const { config, senderJid, senderNumber, replyWithContext } = options;
      const from = msg.key.remoteJid;

      const isOwner = config.owner?.some(n => n.replace(/\D/g,'') === senderNumber?.replace(/\D/g,''));
      if(!isOwner){
        return replyWithContext(`El comando ${config.prefix}reload no existe. Usa ${config.prefix}help`, [senderJid]);
      }

      if(!fs.existsSync(PLUGINS_DIR)){
        return replyWithContext(`📛 No se encontro la carpeta de plugins`, [senderJid]);
      }

      await sock.sendMessage(from, { text: `Recargando plugins...` }, {quoted: msg});

      const files = fs.readdirSync(PLUGINS_DIR).filter(f=> f.endsWith('.js'));
      let ok = 0, fail = 0;
      const failed = [];

      for(const file of files){
        try{
          const fp = path.join(PLUGINS_DIR, file);
          const mod = await import(`file://${fp}?update=${Date.now()}`);
          const data = mod.default || mod;
          if(data?.name) ok++;
          else { fail++; failed.push(`${file} (sin name)`); }
          await new Promise(r=> setTimeout(r, 10));
        }catch(e){
          fail++;
          failed.push(`${file} (${e.message.slice(0,40)})`);
        }
      }

      let txt = `✅ Plugins Recargados\nFuncionando: ${ok}\nCon error: ${fail}`;
      if(failed.length){
        txt += `\n\nErrores:\n` + failed.slice(0,10).map(f=> `- ${f}`).join('\n');
        if(failed.length > 10) txt += `\n... y ${failed.length-10} mas`;
      }

      return replyWithContext(txt, [senderJid]);

    }catch(e){
      const { replyWithContext, senderJid } = options;
      return replyWithContext(`Error: ${e.message}`, [senderJid]);
    }
  }
};
