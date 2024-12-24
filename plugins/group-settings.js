// plugins/group-setting.js

module.exports = {
  name: ["group", "grup", "gc"],
  description: "Manage group settings",
  category: ["Groups"],
  limit: 1,
  async execute(m, { client, isAdmins, isBotAdmins, isGroupOwner, prefix }) {
    if (!m.isGroup) { 
      return m.reply("This command can only be used in groups.");
    }

    if (!isAdmins && !isGroupOwner) {
      return m.reply(
        "Only group admins or the group owner can use this command."
      );
    }

    if (!isBotAdmins) {
      return m.reply("I need to be an admin to change group settings.");
    }

    const args = m.text.split(" ").slice(1);
    if (args.length === 0) {
      return m.reply(
        "Please specify 'open', 'close', 'add', 'subject', or 'description' to change the group settings."
      );
    }

    try {
      if (args[0] === "close") {
        await client.groupSettingUpdate(m.chat, "announcement");
        return m.reply(
          "Success! The group is now closed. Only admins can send messages."
        );
      } else if (args[0] === "open") {
        await client.groupSettingUpdate(m.chat, "not_announcement");
        return m.reply("Success! The group is now open. Everyone can send messages.");
      } else if (args[0] === "add") {
        if (args.length < 2) {
          return m.reply("Please provide the phone numbers to add (e.g., /group add 62831123456 62831123457).");
        }

        const phoneNumbers = args.slice(1);
        const participantIds = phoneNumbers.map(num => `${num}@s.whatsapp.net`);
        await client.groupParticipantsUpdate(m.chat, participantIds, "add");
        
        return m.reply(`Success! Members have been added to the group.`);
      } else if (args[0] === "subject") {
        if (args.length < 2) {
          return m.reply(`Wrong argument. It should be like this: ${prefix}group subject "Group name"`);
        }
        
        const groupSubject = args.slice(1).join(" "); 
        await client.groupUpdateSubject(m.chat, groupSubject);
        return m.reply(`Group subject renamed to: "${groupSubject}"`);
      } else if (args[0] === "description") {
        if (args.length < 2) {
          return m.reply(`Please provide a new description for the group (e.g., ${prefix}group description "New Group Description").`);
        }

        const groupDescription = args.slice(1).join(" "); 
        await client.groupUpdateDescription(m.chat, groupDescription);
        return m.reply(`Group description updated to: "${groupDescription}"`);
      } else {
        return m.reply("Invalid argument. Please use 'open', 'close', 'add', 'subject', or 'description'.");
      }
    } catch (error) {
      console.error("Error updating group settings:", error);
      return m.reply(
        "An error occurred while trying to update group settings. Please try again."
      );
    }
  },
};
