// plugins/quotedmsg.js
module.exports = {
  name: ["quoted", "qmsg", "q"],
  description:
    "Reply to a quoted message and forward the original quoted message.",
  category: ["Utility"],
  limit: 1,
  async execute(m, { client }) {
    if (!m?.quoted) return m.reply("Please reply to a message with a quote!");
    try {
      let quotedMessage = await m.getQuotedObj();
      if (!quotedMessage || !quotedMessage.quoted) {
        return m.reply(`The quoted message is expired`);
      }
      await quotedMessage.quoted.copyNForward(m.chat, false);
    } catch (error) {
      m.reply(`Error: ${String(error)}`);
    }
  },
};
