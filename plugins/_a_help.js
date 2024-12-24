require("../config");
const chalk = require("chalk");
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);
const {
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
} = require("baileys");
const Database = require("better-sqlite3");
const path = require("path");
const { generateWAMessageFromContent, proto, delay } = require('baileys')

const dbPath = path.join(__dirname, "../database", "db.sqlite");
const db = new Database(dbPath, { verbose: console.log });

function isUserRegistered(number) {
  const user = db
    .prepare("SELECT * FROM is_registered WHERE number = ?")
    .get(number);
  return !!user;
}

module.exports = {
  name: ["help", "start", "cmd", "menu"],
  description: "List available commands or commands by category",
  category: ["Main"],
  async execute(m, { client, prefix, command, sessionId }) {
    try {
      const userNumber = m.sender; // User's number
      if (!isUserRegistered(userNumber)) {
        return await client.sendMessage(
          m.chat,
          { text: "You need to register before using this command." },
          { quoted: m }
        );
      }

      const { version } = await fetchLatestWaWebVersion().catch(() =>
        fetchLatestBaileysVersion()
      );

      const args = m.text.trim().split(/ +/).slice(1);
      const requestedCategory = args[0] ? args[0].toLowerCase() : null;
      const totalPlugins = Object.keys(global.plugins).length;

      const userLimit = getUserLimit(m.sender);
      const limit =
        userLimit !== null ? userLimit : global.setting.system.default_limits;

      const categorizedCommands = {};
      global.setting.menu.category.forEach((cat) => {
        categorizedCommands[cat.toLowerCase()] = [];
      });

      Object.values(global.plugins).forEach((plugin) => {
        const category = plugin.category
          ? plugin.category[0].toLowerCase()
          : "other";

        if (!categorizedCommands[category]) {
          categorizedCommands[category] = [];
        }

        const names = Array.isArray(plugin.name) ? plugin.name : [plugin.name];
        categorizedCommands[category].push(...names);
      });

      let helpText = `Hello *${m?.pushName}* I am *${global.setting.system.botname}*, a simple WhatsApp bot created by *${global.setting.system.developer}*\n
- *Library:* \`\`\`baileys\`\`\`
- *Database:* \`\`\`SQLite\`\`\`
- *Your Limit:* \`\`\`${limit} left\`\`\`
- *WhatsApp Version:* \`\`\`${version}\`\`\`
- *Used Prefix:* \`\`\`${prefix}\`\`\`
- *Commands:* \`\`\`${command}\`\`\`
- *Total Plugins:* \`\`\`${totalPlugins}\`\`\`${readmore}\n`;

      if (requestedCategory) {
        if (categorizedCommands[requestedCategory]) {
          const commandsInCategory = categorizedCommands[requestedCategory];
          if (commandsInCategory.length > 0) {
            helpText += `\n${
              requestedCategory.charAt(0).toUpperCase() +
              requestedCategory.slice(1)
            }\n`;
            commandsInCategory.forEach((cmd) => {
              helpText += `- \`\`\`${prefix}${cmd}\`\`\`\ - no description`;
            });
          } else {
            helpText += `\nNo commands available in *${requestedCategory}* category.\n`;
          }
        } else {
          helpText += `\nCategory *${requestedCategory}* not found. Please check the available categories.\n`;
        }
      } else {
        let categoryIndex = 1;
        for (const category in categorizedCommands) {
          if (categorizedCommands[category].length > 0) {
            helpText += `\n*${categoryIndex}. ${
              category.charAt(0).toUpperCase() + category.slice(1)
            }*\n`;
            categorizedCommands[category].forEach((cmd) => {
              helpText += `- \`\`\`${prefix}${cmd}\`\`\`\n`;
            });
            categoryIndex++;
          }
        }
      }
      await client.sendMessage(m.chat, { react: { text: "🎉", key: m.key } });
      const messageContent = generateWAMessageFromContent(
        m.chat,
        proto.Message.fromObject({
          viewOnceMessage: {
            message: {
              liveLocationMessage: {
                degreesLatitude: "0",
                degreesLongitude: "0",
                caption: `${helpText}`,
                sequenceNumber: "100",
                jpegThumbnail: Buffer.from(""),
              },
            },
          },
        }),
        { userJid: m.chat }
      );

      await client.relayMessage(m.chat, messageContent.message, {
        messageId: messageContent.key.id,
      });

      await client.sendMessage(m.chat, { react: { text: "", key: m.key } });
    } catch (err) {
      console.error(
        chalk.red(`[ ERROR ] Failed to execute help command: ${err.message}`)
      );
      await client.sendMessage(m.chat, { react: { text: "💔", key: m.key } });
      client.sendMessage(
        m.chat,
        { text: `Whoops! Something went wrong.` },
        { quoted: m }
      );
      client.sendMessage(
        "6283189607295@s.whatsapp.net",
        { text: `${err}` },
        { quoted: m }
      );
    }
  },
};

function getUserLimit(number) {
  const user = db
    .prepare("SELECT limit_left FROM users WHERE number = ?")
    .get(number);
  return user ? user.limit_left : null;
}
