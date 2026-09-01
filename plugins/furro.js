const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'furro',
  alias: ['furry'],
  category: 'Diversion',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid, senderNumber } = options;
      const from = msg.key.remoteJid;

      let targetJid = senderJid;
      let targetNum = senderNumber?.replace(/[^0-9]/g,'') || senderJid.split('@')[0];

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      if(ctx?.mentionedJid?.[0]){
        targetJid = ctx.mentionedJid[0];
        targetNum = targetJid.split('@')[0];
      }else if(ctx?.participant){
        targetJid = ctx.participant;
        targetNum = targetJid.split('@')[0];
      }

      let h=0;
      for(let i=0;i<targetNum.length;i++){ h=((h<<3)-h)+targetNum.charCodeAt(i); h=h&h; }
      const pct = Math.abs(h)%101;

      let fursona='';
      if(pct<=20) fursona='Felis';
      else if(pct<=40) fursona='Canis';
      else if(pct<=60) fursona='Vulpes';
      else if(pct<=80) fursona='Lupus';
      else fursona='Draco';

      await sock.sendPresenceUpdate('composing', from);

      let prog = await sock.sendMessage(from, { text: `Analizando...\n[████░░░░░░] 20%` }, {quoted: msg});
      for(const p of ['40%','60%','80%','100%']){
        await new Promise(r=>setTimeout(r,600));
        try{ await sock.sendMessage(from, { text: `Analizando...\n[${p}]`, edit: prog.key }); }catch{}
      }
      await new Promise(r=>setTimeout(r,400));
      try{ await sock.sendMessage(from, { delete: prog.key }); }catch{}

      return replyWithContext(
        `Resultado: @${targetNum}\n\nPorcentaje: ${pct}%\nClasificacion: ${fursona}`,
        [targetJid]
      );

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};