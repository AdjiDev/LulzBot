const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../database", "db.sqlite");
const db = new Database(dbPath, { verbose: console.log });

db.prepare(`
  CREATE TABLE IF NOT EXISTS vip_users (
    number TEXT PRIMARY KEY,
    daily_limit INTEGER NOT NULL
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS vip_users (
    number TEXT PRIMARY KEY,
    daily_limit INTEGER NOT NULL,
    expiration_date INTEGER NOT NULL
  )
`).run();


module.exports = {
  name: ["addvip"],
  description: "Add a user to VIP status with a daily limit",
  category: ["Admins"],
  
  async execute(m, { client, isOwner, args }) {
    if (!isOwner) return m.reply("This command is only available to the owner.");

    const targetNumber = args[0]?.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    if (!targetNumber || !args[0]) return m.reply("Please specify a valid user number (e.g., +123456789).");

    const dailyLimit = parseInt(args[1], 10);
    const validLimits = [3, 5, 7, 15, 25, 30, 60, 120];

    if (!validLimits.includes(dailyLimit)) {
      return m.reply("Please specify a valid daily limit: 3, 5, 7, 15, 25, 30, 60, or 120.");
    }

    function addVipUser(number, dailyLimit, durationInDays, m) {
      try {
        const userExists = db.prepare("SELECT * FROM vip_users WHERE number = ?").get(number);
    
        const expirationDate = Date.now() + durationInDays * 24 * 60 * 60 * 1000;
    
        if (userExists) {
          db.prepare(
            "UPDATE vip_users SET daily_limit = ?, expiration_date = ? WHERE number = ?"
          ).run(dailyLimit, expirationDate, number);
          return m.reply(
            `User ${number} is already a VIP. Daily limit updated to ${dailyLimit}, and expiration extended.`
          );
        }
    
        db.prepare(
          "INSERT INTO vip_users (number, daily_limit, expiration_date) VALUES (?, ?, ?)"
        ).run(number, dailyLimit, expirationDate);
    
        m.reply(
          `User ${number} has been added as VIP with a daily limit of ${dailyLimit}. Subscription valid until ${new Date(expirationDate).toLocaleString()}.`
        );
      } catch (error) {
        console.error(`Failed to add VIP user: ${error.message}`);
        m.reply("An error occurred while adding the user to the VIP list. Please try again later.");
      }
    }

    addVipUser(targetNumber, dailyLimit, m);

    function isVipExpired(number) {
      const vipUser = db.prepare("SELECT expiration_date FROM vip_users WHERE number = ?").get(number);
    
      if (!vipUser) {
        return true; 
      }
    
      const currentTime = Date.now();
      return currentTime > vipUser.expiration_date; 
    }
    

  }
};

