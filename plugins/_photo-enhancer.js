const { remini } = require('../lib/remini');
const fs = require('fs');

module.exports = {
    name: ["hd", "recolor", "dehaze"],
    description: "Enhance, recolor, or dehaze an image using AI",
    category: ["Ai"],
    limit: 5,
    async execute(m, { client, mime, qmsg, args }) {
        try {
            if (!mime || !/image/.test(mime)) {
                return m.reply("Please provide an image to enhance.");
            }
            
            const action = args[0] && ["recolor", "dehaze"].includes(args[0]) ? args[0] : "enhance";
            const mediaPath = await client.downloadAndSaveMediaMessage(qmsg, 'image');
            const imageBuffer = fs.readFileSync(mediaPath);

            await client.sendMessage(m.chat, {
                react: {
                    text: "⌛", 
                    key: m.key,
                }
            });

            const enhancedImage = await remini(imageBuffer, action);

            await client.sendMessage(m.chat, {
                image: enhancedImage,
                caption: `Here is your ${action} image result.`
            }, { quoted: m });
            await client.sendMessage(m.chat, {
                react: {
                    text: "", 
                    key: m.key,
                }
            });

        } catch (error) {
            console.error("Error enhancing image:", error);
            return m.reply("Whoops! something went wrongs!");
        }
    }
};
