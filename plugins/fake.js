function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'fake',
  alias: ['falso'],
  category: 'Diversion',

  async execute(sock, msg, options){
    const { config, args, senderJid, replyWithContext } = options;
    const from = msg.key.remoteJid;

    const help = `🚩 *FAKE*\n\nUso: ${config.prefix}fake texto falso | @user texto real\n\nEj:\n${config.prefix}fake quien soy? @521999xxx eres mi novia`;

    if(!args ||!args.length){
      return replyWithContext(help, [senderJid]);
    }

    const fullText = args.join(' ');
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    let who = ctx?.mentionedJid?.[0] || null;

    if(!who){
      const m = fullText.match(/@(\d{8,})/);
      if(m) who = `${m[1]}@s.whatsapp.net`;
    }
    if(!who) who = from;

    // separar fake | real
    let fakeText = '';
    let realText = '';

    if(fullText.includes('|')){
      const [f,r] = fullText.split('|');
      fakeText = f.replace(/@\d+/g,'').trim();
      realText = r.trim();
    } else {
      const sp = '@' + who.split('@')[0];
      const idx = fullText.indexOf(sp);
      if(idx!== -1){
        fakeText = fullText.substring(0, idx).trim().replace(/@\d+/g,'').trim();
        realText = fullText.substring(idx + sp.length).trim();
      } else {
        fakeText = '...';
        realText = fullText;
      }
    }

    if(!fakeText) fakeText = 'Hola';
    if(!realText){
      return replyWithContext(help, [senderJid]);
    }

    const fakeMsg = {
      key: {
        remoteJid: from,
        fromMe: false,
        id: 'FAKE'+Date.now(),
        participant: who.includes('@g.us')? undefined : who
      },
      message: { conversation: fakeText }
    };

    await react(sock,msg,'✅');
    await sock.sendMessage(from, {
      text: realText,
      mentions: [who]
    }, { quoted: copy(fakeMsg) });
  }
};