import syntaxerror from 'syntax-error';
import { format } from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__filename);

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'eval',
  alias: ['e','ev','>'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, senderNumber, isOwner, args, config, usersDB, pushName } = options;
    const from = msg.key.remoteJid;

    if(!isOwner){
      await react(sock,msg,'📛');
      return replyWithContext(`📛 Este comando es solo para owner`, [senderJid]);
    }

    let code = args.join(' ').trim();
    if(!code){
      return replyWithContext(`✳️ Uso: ${config.prefix}eval <codigo>\n> Ej: eval sock.user`, [senderJid]);
    }

    await sock.sendPresenceUpdate('composing', from);

    if(!code.includes('return') &&!code.includes(';') &&!code.includes('\n')){
      code = 'return ' + code;
    }

    let result, syntax='';
    try{
      const AsyncFunction = Object.getPrototypeOf(async()=>{}).constructor;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const qsender = ctx?.participant || senderJid;
      const m = { chat: from, sender: senderJid, from, msg, pushName, isGroup: from.endsWith('@g.us') };

      const fn = new AsyncFunction('sock','msg','options','args','config','usersDB','sender','pushName','from','qsender','require','format','syntaxerror','m','jid', code);
      result = await fn(sock,msg,options,args,config,usersDB,senderNumber,pushName,from,qsender,require,format,syntaxerror,m,from);

    }catch(err){
      const syn = syntaxerror(code,'Eval',{allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true});
      if(syn) syntax = '```'+syn+'```\n\n';
      result = err;
    }

    let out;
    try{
      out = typeof result==='object'? format(result,{depth:3}) : String(result);
    }catch{ out = String(result); }

    if(out.length>3500) out = out.slice(0,3500)+'\n...truncado';
    if(!out) out='Ejecutado sin retorno';

    await react(sock,msg,'✅');
    return replyWithContext(`${syntax}\`\`\`\n${out}\n\`\`\``, [senderJid]);
  }
};