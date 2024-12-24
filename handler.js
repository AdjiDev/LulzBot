// handler.js
require("./config");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const path = require("path");
const ora = require("ora");
const Database = require("better-sqlite3");
const { getGroupAdmins } = require("./lib/extra");
const { exec } = require("child_process");
const crypto = require("crypto");

let pluginFolder = path.join(__dirname, "plugins");
let pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};
const dbPath = path.join(__dirname, "database", "db.sqlite");
const SESSION_EXPIRATION_DURATION = 3 * 24 * 60 * 60 * 1000;
const db = new Database(dbPath, { verbose: console.log });

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    number TEXT PRIMARY KEY,
    limit_left INTEGER
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS vip_users (
    number TEXT PRIMARY KEY
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS is_registered (
    number TEXT PRIMARY KEY,
    pushname TEXT,
    sessionId TEXT,
    auth_token TEXT,
    session_created INTEGER
  )
`
).run();

async function loadPlugins() {
  const spinner = ora("Loading plugins...").start();
  try {
    let pluginsCount = 0;
    for (let filename of fs.readdirSync(pluginFolder).filter(pluginFilter)) {
      try {
        global.plugins[filename] = require(path.join(pluginFolder, filename));
        spinner.succeed(`Loaded plugin: ${filename}`);
        pluginsCount++;
      } catch (e) {
        spinner.fail(`Failed to load plugin: ${filename}`);
        console.error(chalk.red(`Error: ${e.message}`));
        delete global.plugins[filename];
      }
    }
    spinner.succeed(`${pluginsCount} plugins loaded successfully.`);
  } catch (error) {
    spinner.fail("Error loading plugins.");
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

function generateSessionId(m) {
  const sessionId = `UserId: ${m.id}\nSESID: ${crypto
    .randomBytes(8)
    .toString("hex")}`;
  const createdAt = Date.now();
  const number = m.sender; // Get user's number

  db.prepare(
    "INSERT OR REPLACE INTO is_registered (number, sessionId, session_created) VALUES (?, ?, ?)"
  ).run(number, sessionId, createdAt);

  return sessionId;
}

function isSessionExpired(sessionId) {
  const session = db
    .prepare("SELECT session_created FROM is_registered WHERE sessionId = ?")
    .get(sessionId);
  if (session) {
    const currentTime = Date.now();
    return currentTime - session.session_created > SESSION_EXPIRATION_DURATION;
  }
  return true;
}

function isUserRegistered(sessionId) {
  const user = db
    .prepare("SELECT * FROM is_registered WHERE sessionId = ?")
    .get(sessionId);
  return !!user; // Return true if user exists, false otherwise
}

function getUserLimit(number) {
  const user = db
    .prepare("SELECT limit_left FROM users WHERE number = ?")
    .get(number);
  return user ? user.limit_left : null;
}

function updateUserLimit(number, limit) {
  const user = db.prepare("SELECT * FROM users WHERE number = ?").get(number);
  if (user && number !== global.setting.system.owner) {
    db.prepare("UPDATE users SET limit_left = ? WHERE number = ?").run(
      limit,
      number
    );
  } else {
    db.prepare(
      "INSERT OR REPLACE INTO users (number, limit_left) VALUES (?, ?)"
    ).run(number, global.setting.system.default_limits);
  }
}

function isVipUser(number) {
  const vipUser = db
    .prepare("SELECT number FROM vip_users WHERE number = ?")
    .get(number);
  return !!vipUser;
}

async function initialize() {
  await loadPlugins();
}

initialize();

module.exports = handler = async (client, m, chatUpdate, store) => {
  try {
    var body =
      m.mtype === "conversation"
        ? m.message.conversation
        : m.mtype === "imageMessage"
        ? m.message.imageMessage.caption
        : m.mtype === "videoMessage"
        ? m.message.videoMessage.caption
        : m.mtype === "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : m.mtype === "buttonsResponseMessage"
        ? m.message.buttonsResponseMessage.selectedButtonId
        : m.mtype === "listResponseMessage"
        ? m.message.listResponseMessage.singleSelectReply.selectedRowId
        : m.mtype === "templateButtonReplyMessage"
        ? m.message.templateButtonReplyMessage.selectedId
        : "";

    if (m.mtype === "viewOnceMessageV2") return;

    var budy = typeof m.text === "string" ? m.text : "";
    console.log("Message body:", body);
    console.log("From:", m.chat);
    const prefix =
      global.setting.system.prefix.find((p) => body.startsWith(p)) || "/";

    const isCmd = body.startsWith(prefix);
    const command = body
      .replace(prefix, "")
      .trim()
      .split(/ +/)
      .shift()
      .toLowerCase();
    const args = body.trim().split(/ +/).slice(1);
    const text = (q = args.join(" "));
    const pushname = m.pushName || "No Name";
    const botNumber = await client.decodeJid(client.user.id);
    const creator = global.setting.system.owner;
    const isOwner = [botNumber, ...creator]
      .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
      .includes(m.sender);
    const misc = m.quoted || m;
    const quoted =
      misc.mtype == "buttonsMessage"
        ? misc[Object.keys(misc)[1]]
        : misc.mtype == "templateMessage"
        ? misc.hydratedTemplate[Object.keys(misc.hydratedTemplate)[1]]
        : misc.mtype == "product"
        ? misc[Object.keys(misc)[0]]
        : m.quoted
        ? m.quoted
        : m;
    const qmsg = quoted.msg || quoted;
    const mime = (quoted.msg || quoted).mimetype || "";
    const groupMetadata = m.isGroup
      ? await client.groupMetadata(m.chat).catch((e) => {
          console.error(
            chalk.red(`Failed to get group metadata: ${e.message}`)
          );
          return null;
        })
      : null;
    const groupName = m.isGroup ? groupMetadata?.subject : "";
    const participants = m.isGroup ? groupMetadata?.participants : [];
    const groupAdmins = m.isGroup ? await getGroupAdmins(participants) : [];
    const isBotAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false;
    const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false;
    const groupOwner = m.isGroup ? groupMetadata?.owner : "";
    const isGroupOwner = m.isGroup
      ? (groupOwner ? groupOwner : groupAdmins).includes(m.sender)
      : false;
    const isVip = isVipUser(m.sender);
    const sessionId = generateSessionId(m);
    const isRegistered = isUserRegistered(sessionId);

    const fpay = {
      key: {
        remoteJid: "0@s.whatsapp.net",
        fromMe: false,
        id: "adjisan",
        participant: "0@s.whatsapp.net",
      },
      message: {
        requestPaymentMessage: {
          currencyCodeIso4217: "USD",
          amount1000: 999999999,
          requestFrom: "0@s.whatsapp.net",
          noteMessage: { extendedTextMessage: { text: global.botname } },
          expiryTimestamp: 999999999,
          amount: { value: 91929291929, offset: 1000, currencyCode: "USD" },
        },
      },
    };

    let argsLog =
      budy.length > 30 ? `${args.join(" ").substring(0, 30)}...` : budy;
    let senderInfo = m.isGroup ? groupName : pushname;

    console.log(
      chalk.black(chalk.bgWhite("[ LOGS ]")),
      chalk.green(argsLog),
      chalk.magenta("From"),
      chalk.green(senderInfo),
      chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`)
    );

    if (budy.startsWith("=>")) {
      if (!isOwner) return;
      function Return(sul) {
        sat = JSON.stringify(sul, null, 2);
        bang = util.format(sat);
        if (sat == undefined) {
          bang = util.format(sul);
        }
        return m.reply(bang);
      }
      try {
        m.reply(
          util.format(eval(`(async () => { return ${budy.slice(3)} })()`))
        );
      } catch (e) {
        m.reply(String(e));
      }
    }

    if (budy.startsWith("x")) {
      if (!isOwner) return;
      try {
        let evaled = await eval(budy.slice(2));
        if (typeof evaled !== "string")
          evaled = require("util").inspect(evaled);
        await m.reply(`${evaled}`);
      } catch (err) {
        await m.reply(String(err));
      }
    }
    if (budy.startsWith("$")) {
      if (!isOwner) return;
      exec(budy.slice(2), (err, stdout) => {
        if (err) return m.reply(`${err}`);
        if (stdout) return m.reply(`${stdout}`);
      });
    }

    if (isCmd) {
      const plugin = Object.values(global.plugins).find(
        (p) => Array.isArray(p.name) && p.name.includes(command)
      );

      if (plugin) {
        let userLimit = getUserLimit(m.sender);

        if (userLimit === null) {
          updateUserLimit(m.sender, global.setting.system.default_limits);
          userLimit = global.setting.system.default_limits;
        }

        if (
          plugin.limit &&
          !isVipUser(m.sender) &&
          !isOwner &&
          userLimit <= 0
        ) {
          return m.reply("Your limit has been exceeded.");
        }

        if (isSessionExpired(sessionId)) {
          return m.reply("Your session has expired. Please register again.");
        }

        await plugin.execute(m, {
          client,
          isAdmins,
          isBotAdmins,
          budy,
          isGroupOwner,
          isOwner,
          prefix,
          isCmd,
          command,
          text,
          mime,
          args,
          qmsg,
          quoted,
          botNumber,
          store,
          isVip,
          isRegistered,
          sessionId,
          isSessionExpired,
        });

        if (plugin.limit && !isVipUser(m.sender) && !isOwner) {
          updateUserLimit(m.sender, userLimit - plugin.limit);
        }
      } else {
        console.log(
          chalk.black(chalk.bgRed("[ ERROR ]")),
          chalk.red("Command not available: "),
          chalk.green(`${prefix}${command}`)
        );
      }
    }
  } catch (err) {
    console.log(
      chalk.black(chalk.bgRed("[ ERROR ]")),
      chalk.red(util.format(err))
    );
  }
};

global.reload = (_event, filename) => {
  if (pluginFilter(filename)) {
    let dir = path.join(pluginFolder, filename);

    if (dir in require.cache) {
      if (!fs.existsSync(dir)) {
        console.warn(chalk.yellow(`Deleted plugin '${filename}'`));
        delete global.plugins[filename];
        return delete require.cache[dir];
      } else {
        delete require.cache[dir];
        console.log(chalk.cyan(`Update plugins '${filename}'`));
      }
    } else {
      console.log(chalk.cyan(`Requiring new plugin '${filename}'`));
    }

    try {
      global.plugins[filename] = require(dir);
    } catch (e) {
      console.error(
        chalk.red(`Error loading plugin '${filename}': ${e.message}`)
      );
    }
  }
};

Object.freeze(global.reload);
fs.watch(pluginFolder, global.reload);

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
