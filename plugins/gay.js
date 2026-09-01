import fetch from 'node-fetch';

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'gay',
  alias: ['lgbt'],
  category: 'Diversion',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid, senderNumber } = options;
      const from = msg.key.remoteJid;

      let targetJid = senderJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      if(ctx?.mentionedJid?.[0]) targetJid = ctx.mentionedJid[0];
      else if(ctx?.participant) targetJid = ctx.participant;

      const targetNum = targetJid.split('@')[0].replace(/:\d+$/,'');
      const cleanJid = targetNum + '@s.whatsapp.net';

      await react(sock,msg,'🏳️‍🌈');
      await sock.sendPresenceUpdate('composing', from);

      const pct = Math.floor(Math.random()*101);

      let pp='';
      try{ pp = await sock.profilePictureUrl(targetJid,'image'); }catch{ pp='https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg'; }

      const apiUrl = `https://api.delirius.store/canvas/gay?url=${encodeURIComponent(pp)}`;
      let buf=null;
      try{
        const r = await fetch(apiUrl);
        if(r.ok) buf = Buffer.from(await r.arrayBuffer());
      }catch{}

      const text = `Resultado: @${targetNum}\n\nPorcentaje: ${pct}%`;

      if(buf){
        await sock.sendMessage(from, { image: buf, caption: text, mentions:[cleanJid] }, {quoted: msg});
      }else{
        await replyWithContext(text, [cleanJid]);
      }

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};