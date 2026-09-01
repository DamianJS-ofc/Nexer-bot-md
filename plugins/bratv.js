import { stickerVideo } from '../lib/sticker.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metadataFile = path.join(__dirname, '../temp/user_metadata.json');

function loadUserMetadata() {
    try {
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

export default {
    name: 'bratv',
    alias: [],
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;
            const text = args.join(' ').trim();
            
            // Verificar registro
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                await sock.sendMessage(from, { 
                    text: `🍒 Para usar mis comandos tienes que estar registrado.\n> Uso: ${config.prefix}reg Misa.16`,
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

            if (!text) {
                await sock.sendMessage(from, {
                    text: '❀ Por favor, ingresa un texto para crear el Sticker animado.',
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

            await sock.sendMessage(from, { react: { text: "🕒", key: msg.key } });

            // Obtener metadata del usuario
            const userMetadata = getUserMetadata(senderNumber);
            
            // Definir packname y autor
            let customPackname = ``;
            let customAuthor = '';

            if (userMetadata) {
                customPackname = userMetadata.packname || customPackname;
                customAuthor = userMetadata.author || customAuthor;
            }

            // Obtener video de la API
            const response = await axios.get(`https://skyzxu-brat.hf.space/brat-animated`, { 
                params: { text }, 
                responseType: 'arraybuffer',
                timeout: 30000
            });

            // Crear sticker animado usando la librería sticker.js
            const stickerBuffer = await stickerVideo(response.data, customPackname, customAuthor);
            
            await sock.sendMessage(from, { 
                sticker: stickerBuffer,
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

            await sock.sendMessage(from, { react: { text: "✔️", key: msg.key } });

        } catch (error) {
            console.error('❌ Error en bratv:', error);
            
            await sock.sendMessage(msg.key.remoteJid, { react: { text: "✖️", key: msg.key } });
            
            let errorMsg = `⚠︎ Se ha producido un problema.\n> Usa *${options.config.prefix}report* para informarlo.`;
            
            if (error.message.includes('FFmpeg')) {
                errorMsg += '\n\n🌴 Para stickers animados necesito FFmpeg instalado.';
            }
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: errorMsg,
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
        }
    }
};
