// plugins/getpp.js
const { MessageType } = require('baileys');

module.exports = {
    name: ["getprofile", "getpp"],
    description: "Get the profile picture of a user",
    category: ["Utility"],
    limit: 1,
    async execute(m, { client }) {
        if (!m.quoted || !m.quoted.sender) {
            return m.reply("Please quote a message from the user whose profile picture you want to retrieve.");
        }

        const quotedUser = m.quoted.sender;
        const userJid = quotedUser;

        try {
            const lowResUrl = await client.profilePictureUrl(userJid);
            const highResUrl = await client.profilePictureUrl(userJid, 'image');

            await client.sendMessage(m.chat, {
                image: { url: highResUrl },
                caption: `Profile picture of ${quotedUser}:`,
            }, { quoted: m });
            
            console.log("Download profile picture from: " + lowResUrl);

        } catch (error) {
            console.error("Error retrieving profile picture:", error);
            return m.reply("Not found!");
        }
    },
};
