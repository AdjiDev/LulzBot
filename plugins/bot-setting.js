require("../config");

module.exports = {
  name: ["mode", "set"],
  description: "Change the bot's mode (self/public)",
  category: ["Main"],
  async execute(m, { client, args, isOwner, botNumber }) {

    if (args.length !== 1 || !["self", "public"].includes(args[0].toLowerCase())) {
      return m.reply("Usage: /mode <self|public>\n- *self:* Only the owner can use the bot.\n- *public:* Everyone can use the bot.");
    }

    const mode = args[0].toLowerCase();
    if (mode === "self") {
      if (!isOwner && !botNumber) {
        return m.reply("Only the owner can switch the bot to *self* mode.");
      }
      client.public = false; // Set mode ke self
      await m.reply("Bot is now in *self* mode. Only the owner can use commands.");
    } else if (mode === "public") {
      client.public = true; // Set mode ke public
      await m.reply("Bot is now in *public* mode. Everyone can use commands.");
    }
  },
};
