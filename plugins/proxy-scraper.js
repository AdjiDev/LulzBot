const { fetchProxies, getTotalProxies } = require("../net/scrape");

module.exports = {
  name: ["updateproxy", "upproxy"],
  description: "Update proxy list",
  category: ["Utility"],
  limit: 1,
  async execute(m, { client, quoted, isOwner }) {
    if (!isOwner) {
      return m.reply("*[ ! ]* ```Restricted command: Only the owner can execute this.```");
    }

    try {
      m.reply("*[ + ]* ```Updating proxies . . .```");

      await fetchProxies();
      const total = getTotalProxies()

      m.reply(`*[ √ ]* \`\`\`Success updating proxies.\`\`\`\nTotal: \`\`\`${total}\`\`\``);
    } catch (error) {
      console.error("Error updating proxies:", error);
      m.reply(`*[ ! ]* \`\`\`Failed to update proxies.\`\`\` Error: \`\`\`${error.message}\`\`\``);
    }
  },
};
