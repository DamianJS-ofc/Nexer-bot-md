const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'femboy',
  alias: ['fem'],
  category: 'Diversion',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid, senderNumber } = options;
      const from = msg.key.remoteJid;

      let targetJid = senderJid;
      let targetNum = senderNumber?.replace(/[^0-9]/g,'') || senderJid?.split('@')[0];

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      if(ctx?.mentionedJid?.[0]){
        targetJid = ctx.mentionedJid[0];
        targetNum = targetJid.split('@')[0];
      }else if(ctx?.participant){
        targetJid = ctx.participant;
        targetNum = targetJid.split('@')[0];
      }

      const isSpecial = targetNum === '42211290910827';
      let pct;
      if(isSpecial) pct = 100;
      else{
        let h=0;
        for(let i=0;i<targetNum.length;i++){ h=((h<<7)-h)+targetNum.charCodeAt(i); h=h&h; }
        pct = Math.abs(h)%101;
      }

      let txt='';
      if(pct<=10) txt="Masculinidad alta";
      else if(pct<=20) txt="Masculinidad estable";
      else if(pct<=30) txt="Rasgo delicado leve";
      else if(pct<=40) txt="Tendencia kawaii inicial";
      else if(pct<=50) txt="Estilo neutro";
      else if(pct<=60) txt="Androgino";
      else if(pct<=70) txt="Esencia femboy";
      else if(pct<=80) txt="Dominio del estilo femboy";
      else if(pct<=90) txt="Perfil femboy avanzado";
      else txt="Perfil femboy completo";

      await sock.sendPresenceUpdate('composing', from);

      let prog = await sock.sendMessage(from, {
        text: `Analizando...\n[████░░░░░░] 20%`
      }, {quoted: msg});

      const bars = ["40%","60%","80%","100%"];
      for(const b of bars){
        await new Promise(r=>setTimeout(r,700));
        try{
          await sock.sendMessage(from, { text: `Analizando...\n[${b}]`, edit: prog.key });
        }catch{}
      }

      await new Promise(r=>setTimeout(r,500));
      try{ await sock.sendMessage(from, { delete: prog.key }); }catch{}

      return replyWithContext(
        `Resultado: @${targetNum}\n\nPorcentaje: ${pct}%\nClasificacion: ${txt}`,
        [targetJid]
      );

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};