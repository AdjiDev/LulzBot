// plugins/quotedmsg.js
module.exports = {
    name: ["method", "listmethod"],
    description:
      "List of stresser method",
    category: ["Other"],
    limit: 1,
    async execute(m, { client }) {
        m.reply(`*Method List:*\n\`\`\`------------------\`\`\`
\`\`\`
raw
proxy
storm
httpx
swarm
glory
tlsvip
\`\`\``)
    },
  };
   