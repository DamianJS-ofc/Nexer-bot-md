import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import pkg from 'node-webpmux';
import { fileURLToPath } from 'url';
import axios from 'axios';

const { Image } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempFolder = path.join(__dirname, '../databases/');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

// Cargar metadatos
function loadUserMetadata() {
    try {
        const metadataFile = path.join(__dirname, '../databases/user_metadata.json');
        if (fs.existsSync(metadataFile)) {
            const data = fs.readFileSync(metadataFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error cargando metadatos:', error);
    }
    return {};
}

function getUserMetadata(userNumber) {
    const metadata = loadUserMetadata();
    return metadata[userNumber] || null;
}

async function getGroupName(sock, groupId) {
    try {
        if (groupId.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(groupId);
            return groupMetadata.subject || 'Grupo';
        }
    } catch (error) {
        console.log('Error obteniendo nombre del grupo:', error);
    }
    return 'Grupo';
}

function randomFileName(ext) {
    return `${randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`;
}

async function imageToWebp(media) {
    const tmpIn = path.join(tempFolder, randomFileName('jpg'));
    const tmpOut = path.join(tempFolder, randomFileName('webp'));
    fs.writeFileSync(tmpIn, media);

    return new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
            .on('error', reject)
            .on('end', () => {
                const buff = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpIn);
                fs.unlinkSync(tmpOut);
                resolve(buff);
            })
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
            ])
            .toFormat('webp')
            .save(tmpOut);
    });
}

async function addExif(webpBuffer, metadata) {
    const tmpIn = path.join(tempFolder, randomFileName('webp'));
    const tmpOut = path.join(tempFolder, randomFileName('webp'));
    fs.writeFileSync(tmpIn, webpBuffer);

    const json = {
        "sticker-pack-id": "starry_moonlight",
        "sticker-pack-name": metadata.packname || "",
        "sticker-pack-publisher": metadata.author || "",
        "emojis": ["✨"]
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    const img = new Image();
    await img.load(tmpIn);
    img.exif = exif;
    await img.save(tmpOut);
    fs.unlinkSync(tmpIn);
    return tmpOut;
}

async function writeExifImg(media, metadata) {
    const wMedia = await imageToWebp(media);
    return await addExif(wMedia, metadata);
}

export default {
    name: 'bratanime',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;
            
            // Verificar registro
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                await sock.sendMessage(from, { 
                    text: `🍒 Para usar mis comandos tienes que estar registrado.\n> Uso: ${config.prefix}reg nombre`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }
            
            await sock.sendPresenceUpdate('composing', from);

            const text = args.join(' ').trim();
            
            if (!text) {
                await sock.sendMessage(from, { 
                    text: `🌠 Debes proporcionar un texto\nUso: ${config.prefix}bratanime Hola`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            // Reacción de carga
            await sock.sendMessage(from, {
                react: { text: '🌙', key: msg.key }
            });

            // Obtener metadata del usuario
            const userMetadata = getUserMetadata(senderNumber);
            
            let customPackname = '';
            let customAuthor = '';

            let groupName = '';
            if (from.endsWith('@g.us')) {
                groupName = await getGroupName(sock, from);
            }

            const hasCustomMetadata = userMetadata && (userMetadata.packname || userMetadata.author);

            if (hasCustomMetadata) {
                customPackname = userMetadata.packname || '';
                customAuthor = userMetadata.author || '';
            } else {
                customPackname = `🌵 ${pushName || senderNumber}`;
                customAuthor = `🌵 Bot » ${config.name || 'Moonlight'}`;
                if (from.endsWith('@g.us') && groupName) {
                    customAuthor = `🌵 Grupo » ${groupName}`;
                }
            }

            // Llamar a la API de bratanime
            const apiUrl = `https://api.nexray.web.id/maker/bratanime?text=${encodeURIComponent(text)}`;
            console.log(`🎨 Generando bratanime: ${apiUrl}`);
            
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.data || response.data.length === 0) {
                throw new Error('No se pudo generar la imagen bratanime');
            }

            const imageBuffer = Buffer.from(response.data);

            // Convertir a sticker
            const metadata = { packname: customPackname, author: customAuthor };
            
            let stickerPath;
            try {
                stickerPath = await writeExifImg(imageBuffer, metadata);
            } catch (processError) {
                console.error('Error procesando:', processError);
                throw new Error(`Error al convertir: ${processError.message}`);
            }

            // Enviar sticker
            await sock.sendMessage(from, {
                sticker: fs.readFileSync(stickerPath),
                contextInfo: {
                    mentionedJid: [senderJid],
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            // Limpiar archivo temporal
            try {
                fs.unlinkSync(stickerPath);
            } catch (e) {}
            
            // Reacción de éxito
            await sock.sendMessage(from, { react: { text: '🎑', key: msg.key } });
            
            console.log(`✅ Bratanime creado para ${pushName || senderNumber}: "${text}"`);

        } catch (error) {
            console.error('❌ Error en bratanime:', error);
            
            // Reacción de error
            try {
                await sock.sendMessage(msg.key.remoteJid, { 
                    react: { text: '❌', key: msg.key }
                });
            } catch (e) {}
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `🍧 Error: ${error.message}`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {}
        }
    }
};