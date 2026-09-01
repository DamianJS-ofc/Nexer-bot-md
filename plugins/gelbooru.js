import axios from 'axios';
import * as cheerio from 'cheerio';

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'imagen',
  category: 'Busqueda',
  alias: ['img'],

  async execute(sock, msg, options){
    try{
      const { replyWithContext, args, senderJid } = options;
      const from = msg.key.remoteJid;
      const query = args.join('_') || 'flower';

      await react(sock,msg,'🔍');
      await sock.sendPresenceUpdate('composing', from);

      let imageBuffer = null;
      let mimetype = 'image/jpeg';
      let total = 0;

      try{
        const listUrl = `https://gelbooru.com/index.php?page=post&s=list&tags=${encodeURIComponent(query)}`;
        const listRes = await axios.get(listUrl, {
          headers:{'User-Agent':'Mozilla/5.0'},
          timeout:15000
        });
        const $ = cheerio.load(listRes.data);
        const links=[];
        $('.thumbnail-preview a').each((_,el)=>{
          const href=$(el).attr('href');
          if(href?.includes('page=post&s=view&id=')){
            links.push(href.startsWith('http')?href:`https://gelbooru.com/${href}`);
          }
        });
        const uniq=[...new Set(links)];
        total=uniq.length;
        if(!uniq.length) throw new Error('Sin resultados');

        const randomPost = uniq[Math.floor(Math.random()*uniq.length)];
        const postRes = await axios.get(randomPost, {headers:{'User-Agent':'Mozilla/5.0'}, timeout:15000});
        const $p = cheerio.load(postRes.data);

        let url = $p('meta[property="og:image"]').attr('content') || $p('#image').attr('src') || null;
        if(!url) throw new Error('Imagen no encontrada');
        if(!url.startsWith('http')) url=`https://gelbooru.com/${url}`;

        if(url.includes('.png')) mimetype='image/png';

        const imgRes = await axios.get(url, {responseType:'arraybuffer', timeout:20000});
        imageBuffer = Buffer.from(imgRes.data);

      }catch(scrapeErr){
        const fallbacks=[
          'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
          'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=800',
          'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'
        ];
        try{
          const fb = fallbacks[Math.floor(Math.random()*fallbacks.length)];
          const r = await axios.get(fb, {responseType:'arraybuffer', timeout:15000});
          imageBuffer = Buffer.from(r.data);
          total = 0;
        }catch{}
      }

      if(!imageBuffer){
        await react(sock,msg,'❌');
        return replyWithContext(`❌ No se encontro imagen para: ${query}`, [senderJid]);
      }

      await sock.sendMessage(from, {
        image: imageBuffer,
        mimetype,
        caption: `Resultado: ${query.replace(/_/g,' ')}\nTotal: ${total || 'N/A'}`,
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
