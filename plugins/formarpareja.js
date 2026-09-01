const toM = (a) => '@' + a.split('@')[0];
const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'formarpareja',
  alias: ['formarparejas','shippear','ship'],
  category: 'Grupos',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid } = options;
      const from = msg.key.remoteJid;

      if(!from.endsWith('@g.us')){
        await react(sock,msg,'📛');
        return replyWithContext(`📛 Este comando solo funciona en grupos.`, [senderJid]);
      }

      await sock.sendPresenceUpdate('composing', from);

      let participants;
      try{
        const meta = await sock.groupMetadata(from);
        participants = meta.participants.map(v=>v.id);
      }catch{
        await react(sock,msg,'❌');
        return replyWithContext(`❌ No se pudo obtener la lista de participantes.`, [senderJid]);
      }

      if(participants.length < 2){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ Se requieren al menos 2 participantes.`, [senderJid]);
      }

      const a = participants[Math.floor(Math.random()*participants.length)];
      let b;
      do{ b = participants[Math.floor(Math.random()*participants.length)]; }while(b===a);

      const mensaje = `Compatibilidad detectada:\n\n${toM(a)} + ${toM(b)}\n\nProbabilidad: ${Math.floor(Math.random()*30)+70}%`;

      await sock.sendMessage(from, {
        text: mensaje,
        mentions: [a,b]
      }, {quoted: msg});

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};
