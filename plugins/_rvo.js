// plugins/readViewOnce.js
const {
    downloadContentFromMessage
} = require('baileys');

module.exports = {
    name: ["readviewonce", "rvo"],
    description: "Download and resend a view once message",
    category: ["Utility"],
    limit: 1,
    async execute(m, { client }) {
        if (!m.quoted) return m.reply("Reply to a view once message.");
        if (m.quoted.mtype !== "viewOnceMessageV2") {
            return m.reply("This is not a view once message.");
        }

        let msg = m.quoted.message;
        let type = Object.keys(msg)[0];

        try {
            let media = await downloadContentFromMessage(
                msg[type],
                type == "imageMessage" ? "image" : "video"
            );

            let buffer = Buffer.from([]);
            for await (const chunk of media) {
                buffer = Buffer.concat([buffer, chunk]); 
            }

            if (/video/.test(type)) {
                return client.sendMessage(m.chat, {
                    video: buffer,
                    caption: msg[type].caption || "",
                    mimetype: 'video/mp4' 
                }, { quoted: m });
            } else if (/image/.test(type)) {
                return client.sendMessage(m.chat, {
                    image: buffer,
                    caption: msg[type].caption || "",
                    mimetype: 'image/jpeg'
                }, { quoted: m });
            } else {
                return m.reply("Unsupported media type.");
            }
        } catch (error) {
            if (error.message.includes("bad decrypt")) {
                console.warn("Bad decrypt error ignored:", error.message);
            } else {
                console.error("Error reading view once message:", error);
                m.reply("An error occurred while processing the view once message.");
            }
        }
    },
};
