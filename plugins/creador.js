export default {
  name: 'creador',
  alias: ['owner', 'contacto', 'dev'],
  category: 'Info',

  async execute(sock, msg, options) {
    const from = msg.key.remoteJid;

    const ownerNumber = "5492645746772@s.whatsapp.net";
    const ownerName = "DamianJS-ofc";
    const numberOnly = ownerNumber.split('@')[0];

    await sock.sendMessage(from, {
      contacts: {
        displayName: ownerName,
        contacts: [{
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${numberOnly}:+${numberOnly}\nEND:VCARD`
        }]
      }
    }, { quoted: msg });

    return sock.sendMessage(from, {
      text: `*CONTACTO CREADOR*\n\n> 👤 Nombre: ${ownerName}\n> 📞 Numero: +${numberOnly}\n\nSi tienes dudas o sugerencias, habla directo al contacto de arriba.`
    }, { quoted: msg });
  }
};