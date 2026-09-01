import axios from 'axios';
import FormData from 'form-data';

const API_URL = 'https://api.siputzx.my.id/api/canvas/gay';
const DEFAULT_AVATAR = 'https://d.uguu.se/rVVfkyEM.jpeg';

const cleanJid = j => j?.replace(/:\d+@/,'@');
const numJid = j => cleanJid(j)?.split('@')[0].replace(/[^0-9]/g,'');
const genName = () => Math.random().toString(36).slice(2,10)+'.jpg';

async function uploadAuto(buf){
  try{
    const f = new FormData();
    f.append('reqtype','fileupload');
    f.append('fileToUpload', buf, {filename: genName()});
    const r = await axios.post('https://catbox.moe/user/api.php', f, {headers:f.getHeaders(), timeout:30000});
    if(typeof r.data==='string' && r.data.startsWith('https://')) return r.data;
    throw new Error();
  }catch{
    try{
      const f = new FormData();
      f.append('files[]', buf, genName());
      const r = await axios.post('https://uguu.se/upload.php', f, {headers:f.getHeaders(), timeout:30000});
      return r.data.files[0].url;
    }catch{
      const f = new FormData();
      f.append('file', buf, {filename: genName(), contentType:'image/jpeg'});
      const r = await axios.post('https://qu.ax/upload.php', f, {headers:f.getHeaders(), timeout:30000});
      return r.data.files[0].url;
    }
  }
}

async function getPP(sock,jid){
  try{
    const url = await sock.profilePictureUrl(cleanJid(jid),'image');
    const res = await axios.get(url,{responseType:'arraybuffer'});
    return Buffer.from(res.data);
  }catch{ return null; }
}

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'gay2',
  alias: ['nivelgay'],
  category: 'Diversion',

  async execute(sock, msg, options){
    try{
      const { replyWithContext, senderJid } = options;
      const from = msg.key.remoteJid;

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const targetRaw = ctx?.mentionedJid?.[0] || ctx?.participant || null;

      if(!targetRaw){
        await react(sock,msg,'✳️');
        return replyWithContext(`✳️ Uso: gay2 @usuario (mencion o respuesta)`, [senderJid]);
      }

      const targetJid = cleanJid(targetRaw);
      const targetNum = numJid(targetJid);

      await react(sock,msg,'🔍');
      await sock.sendPresenceUpdate('composing', from);

      const profileBuf = await getPP(sock, targetJid);
      const avatarUrl = profileBuf? await uploadAuto(profileBuf) : DEFAULT_AVATAR;

      const pct = Math.floor(Math.random()*100)+1;

      const api = `${API_URL}?nama=${encodeURIComponent(targetNum)}&avatar=${encodeURIComponent(avatarUrl)}&num=${pct}`;
      const res = await axios.get(api,{responseType:'arraybuffer', timeout:30000});

      if(!res.data?.length) throw new Error('Respuesta vacia de API');

      await sock.sendMessage(from, {
        image: Buffer.from(res.data),
        caption: `Resultado: @${targetNum}\nPorcentaje: ${pct}%`,
        mentions: [targetJid]
      }, {quoted: msg});

      await react(sock,msg,'✅');

    }catch(e){
      const { replyWithContext, senderJid } = options;
      await react(sock,msg,'❌');
      return replyWithContext(`❌ Error: ${e.message}`, [senderJid]);
    }
  }
};