const config = require("../config"); 

module.exports = {
  name: ["h", "hidetag"],
  description: "Send an announcement to all group members",
  category: ["Groups"],
  limit: 1,
  async execute(m, { client, isAdmins, isBotAdmins, isGroupOwner, isOwner }) {
    if (!m.isGroup) return m.reply("This command can only be used in groups.");

    if (!isAdmins && !isGroupOwner && !isOwner) {
      return m.reply("Only admins or group owners can use this command.");
    }

    const groupMetadata = await client.groupMetadata(m.chat);
    const participants = groupMetadata.participants;

    const args = m.text.trim().split(/ +/).slice(1);
    const announcementText = args.join(" ") || "Admins tag all members";

    await client.sendMessage(
      m.chat,
      {
        text: announcementText,
        mentions: participants.map((a) => a.id),
        sendEphemeral: true,
      },
      { quoted: m }
    );
  },
};
