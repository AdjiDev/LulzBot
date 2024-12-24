const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../database", "db.sqlite");
const db = new Database(dbPath, { verbose: console.log });

module.exports = {
  name: ["removevip"],
  description: "Remove a user from VIP status",
  category: ["Admins"],
  
  async execute(m, { client, isOwner, args }) {
    if (!isOwner) return m.reply("This command is only available to the owner.");

    const targetNumber = args[0]?.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    if (!targetNumber || !args[0]) return m.reply("Please specify a valid user number (e.g., +123456789).");

    removeVipUser(targetNumber, m);
  }
};

function removeVipUser(number, m) {
  try {
    const userExists = db.prepare("SELECT * FROM vip_users WHERE number = ?").get(number);

    if (!userExists) {
      return m.reply(`User ${number} is not a VIP.`);
    }

    db.prepare("DELETE FROM vip_users WHERE number = ?").run(number);
    m.reply(`User ${number} has been removed from VIP.`);
  } catch (error) {
    console.error(`Failed to remove VIP user: ${error.message}`);
    m.reply("An error occurred while removing the user from the VIP list. Please try again later.");
  }
}
