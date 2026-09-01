import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const format = (b) => {
  if(!b) return '0 B';
  const k=1024, s=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(b)/Math.log(k));
  return `${(b/Math.pow(k,i)).toFixed(2)} ${s[i]}`;
};

const folderSize = (p) => {
  let t=0;
  try{
    if(!fs.existsSync(p)) return 0;
    for(const f of fs.readdirSync(p)){
      const fp = path.join(p,f);
      const st = fs.statSync(fp);
      if(st.isFile()) t+=st.size;
      else if(st.isDirectory()) t+=folderSize(fp);
    }
  }catch{}
  return t;
};

const react = (sock,msg,e) => sock.sendMessage(msg.key.remoteJid,{react:{text:e,key:msg.key}}).catch(()=>{});

export default {
  name: 'disk',
  alias: ['storage','uso'],
  category: 'Owner',

  async execute(sock, msg, options){
    const { replyWithContext, senderJid, isOwner } = options;

    if(!isOwner){
      await react(sock,msg,'📛');
      return replyWithContext(`📛 Solo owner`, [senderJid]);
    }

    const base = process.cwd();
    const temp = folderSize(path.join(base,'temp'));
    const sess = folderSize(path.join(base,'Sessions'));
    const dbs = folderSize(path.join(base,'databases'));
    const plugs = folderSize(path.join(base,'plugins'));
    const total = temp+sess+dbs+plugs;

    let df = 'no disponible';
    try{
      const { stdout } = await execAsync('df -h / | tail -n 1');
      df = stdout.trim();
    }catch{}

    const txt =
`💾 *STORAGE*

📁 Temp: ${format(temp)}
📁 Sessions: ${format(sess)}
📁 Databases: ${format(dbs)}
📁 Plugins: ${format(plugs)}
━━━━━━━━━━━━
💿 Total bot: ${format(total)}

🖥️ Disk: \`${df}\``;

    await react(sock,msg,'💾');
    return replyWithContext(txt, [senderJid]);
  }
};