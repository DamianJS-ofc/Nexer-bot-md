import { dirname } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import webp from "node-webpmux";
import fetch from "node-fetch";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const support = { ffmpeg: true, ffprobe: true, ffmpegWebp: true };

async function runFFmpeg(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', c => stderr += c.toString());
    proc.on('error', reject);
    const t = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('FFmpeg timeout')); }, timeout);
    proc.on('close', code => {
      clearTimeout(t);
      if (code !== 0) reject(new Error(`FFmpeg ${code}: ${stderr.slice(-500)}`));
      else resolve();
    });
  });
}

async function stickerFFmpeg(buffer, isVideo = false) {
  const type = await fileTypeFromBuffer(buffer);
  const ext = type?.ext || (isVideo ? 'mp4' : 'jpg');
  const id = Date.now() + Math.random().toString(16).slice(2);
  const input = path.join(tmpDir, `in_${id}.${ext}`);
  const output = path.join(tmpDir, `out_${id}.webp`);
  await fs.promises.writeFile(input, buffer);

  const vf = isVideo 
    ? 'fps=15,scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000'
    : 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000';

  const args = [
    '-i', input,
    '-vcodec', 'libwebp',
    '-vf', vf,
    '-loop', '0',
    '-preset', 'default',
    '-an', '-vsync', '0',
    '-s', '512:512',
    '-compression_level', '4',
    '-q:v', '75',
    '-f', 'webp',
    output
  ];

  try {
    await runFFmpeg(args, isVideo ? 45000 : 30000);
    const res = await fs.promises.readFile(output);
    return res;
  } finally {
    await fs.promises.unlink(input).catch(()=>{});
    await fs.promises.unlink(output).catch(()=>{});
  }
}

async function addExif(webpSticker, packname, author, categories = [""]) {
  try {
    const img = new webp.Image();
    await img.load(webpSticker);
    const json = {
      "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
      "sticker-pack-name": packname || 'NEXER BOT MD',
      "sticker-pack-publisher": author || 'DamianJS-ofc',
      "emojis": categories.length ? categories : ["⭐"]
    };
    // WhatsApp requiere exif con header
    const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    img.exif = exif;
    return await img.save(null);
  } catch {
    return webpSticker;
  }
}

async function sticker(img, url, packname, author, categories = [""]) {
  let buffer = img;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  if (!buffer) throw new Error('Buffer vacío');

  const ftype = await fileTypeFromBuffer(buffer);
  const isVideo = ftype?.mime?.startsWith('video/') || false;

  let webpBuff;
  try {
    webpBuff = await stickerFFmpeg(buffer, isVideo);
  } catch (e) {
    console.log('[STICKER] FFmpeg falló, fallback:', e.message);
    // si es imagen directa, intentar sin ffmpeg
    if (ftype?.mime?.startsWith('image/')) webpBuff = buffer;
    else throw e;
  }

  return await addExif(webpBuff, packname || 'NEXER BOT MD', author || 'DamianJS-ofc', categories);
}

async function stickerVideo(videoBuffer, packname, author) {
  const webpBuff = await stickerFFmpeg(videoBuffer, true);
  return await addExif(webpBuff, packname || 'NEXER BOT MD', author || 'DamianJS-ofc');
}

export { sticker, stickerVideo, addExif, support };
