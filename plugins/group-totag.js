const config = require("../config"); // Mengimpor konfigurasi

module.exports = {
  name: ["tagquoted", "totag"],
  description: "Notify everyone with quoted messages",
  category: ["Groups"],
  limit: 1,
  async execute(m, { client, isAdmins, isBotAdmins, isGroupOwner, isOwner }) {
    if (!m.isGroup) return m.reply("This command can only be used in groups.");
    if (!isAdmins && !isGroupOwner && !isOwner) return m.reply("This command can only be used by admins.");

    if (!m?.quoted) return m.reply("Please quote a message to tag all participants.");

    const groupMetadata = await client.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    client.sendMessage(m.chat, {
      forward: m.quoted.fakeObj,
      mentions: participants.map((a) => a.id),
    });
  },
};
