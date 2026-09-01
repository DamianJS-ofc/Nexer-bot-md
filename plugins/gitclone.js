import fetch from 'node-fetch';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'gitclone',
  alias: ['github','git','clonar'],
  category: 'Descargas',

  async execute(sock, msg, options){
    try{
      const { args, config, senderJid, replyWithContext } = options;
      const from = msg.key.remoteJid;
      const url = args[0];

      if(!url){
        await react(sock,msg,'✳️');
        return replyWithContext(`✳️ Uso: ${config.prefix}gitclone <url github>\nEj: ${config.prefix}gitclone https://github.com/user/repo`, [senderJid]);
      }

      if(!regex.test(url)){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ URL invalida. Debe ser de github.com`, [senderJid]);
      }

      const [_, userRepo, repoRaw] = url.match(regex) || [];
      const repoName = repoRaw.replace(/.git$/,'');
      const apiRepo = `https://api.github.com/repos/${userRepo}/${repoName}`;
      const apiZip = `${apiRepo}/zipball`;

      await react(sock,msg,'🔄');
      await sock.sendPresenceUpdate('composing', from);

      let repoRes, zipRes;
      try{
        [repoRes, zipRes] = await Promise.all([fetch(apiRepo), fetch(apiZip)]);
      }catch{
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Error de conexion con GitHub`, [senderJid]);
      }

      if(!repoRes.ok ||!zipRes.ok){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Repositorio no encontrado o privado`, [senderJid]);
      }

      const data = await repoRes.json();
      const zipBuf = await zipRes.buffer();

      let filename = `${userRepo}_${repoName}.zip`;
      const cd = zipRes.headers.get('content-disposition');
      const m = cd?.match(/filename="?([^"]+)"?/);
      if(m?.[1]) filename = m[1];

      const info = `GitHub Download\n\nRepo: ${userRepo}/${repoName}\nOwner: ${data.owner?.login}\nStars: ${data.stargazers_count}\nForks: ${data.forks_count}\nDesc: ${data.description || '-'}\nSize: ${(zipBuf.length/1024/1024).toFixed(2)} MB`;

      await sock.sendMessage(from, {
        document: zipBuf,
        fileName: filename,
        caption: info,
        mimetype: 'application/zip',
        mentions:[senderJid]
      }, {quoted: msg});

      await react(sock,msg,'✅');

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};