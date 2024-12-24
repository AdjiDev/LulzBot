const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../database", "db.sqlite");
const db = new Database(dbPath, { verbose: console.log });

module.exports = {
  name: ["listvip"],
  description: "List all VIP users and their daily limits",
  category: ["Admins"],
  
  async execute(m, { client, isOwner }) {
    if (!isOwner) return m.reply("This command is only available to the owner.");

    listVipUsers(m);
  }
};

function listVipUsers(m) {
  try {
    const vipUsers = db.prepare("SELECT * FROM vip_users").all();

    if (vipUsers.length === 0) {
      return m.reply("No VIP users found.");
    }

    let responseText = "List of VIP users and their daily limits:\n\n";
    vipUsers.forEach(user => {
      responseText += `*${user.number}* - Limit: ${user.daily_limit}\n`;
    });

    m.reply(responseText);
  } catch (error) {
    console.error(`Failed to list VIP users: ${error.message}`);
    m.reply("An error occurred while retrieving the VIP user list. Please try again later.");
  }
}
