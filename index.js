const sessionName = "database/auth";
const {
  default: WaSockets,
  WA_DEFAULT_EPHEMERAL,
  delay,
  PHONENUMBER_MCC,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateForwardMessageContent,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateMessageID,
  generateWAMessage,
  areJidsSameUser,
  getContentType,
  fetchLatestWaWebVersion,
  downloadContentFromMessage,
  makeInMemoryStore,
  jidDecode,
  proto,
  Browsers,
} = require("baileys");
const path = require("path");
const FileType = require("file-type");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const axios = require("axios");
const chalk = require("chalk");
const _ = require("lodash");
const PhoneNumber = require("awesome-phonenumber");
const {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
} = require("./lib/exif");
require("./config");
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});
require('./config')
const NodeCache = require("node-cache");
const readline = require("readline");
const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

/**
 * Recoded by adjidev
 * real source https://github.com/sansekai/Wa-OpenAi
 * @param {*} client
 * @param {*} m
 * @param {*} store
 * @returns
 */
function smsg(client, m, store) {
  if (!m) return m;
  let M = proto.WebMessageInfo;
  const seen = new Set();
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys =
      (m.id.startsWith("BAE5") && m.id.length === 16) ||
      (m.id.startsWith("3EB0") &&
        (m.id.length === 22 || m.id.length === 40));
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = client.decodeJid(
      (m.fromMe && client.user.id) ||
      m.participant ||
      m.key.participant ||
      m.chat ||
      ""
    );
    
    if (m.isGroup) m.participant = client.decodeJid(m.key.participant) || "";
  }

  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg =
      m.mtype == "viewOnceMessage"
        ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
        : m.message[m.mtype];
    m.body =
      m.message.conversation ||
      m.msg.caption ||
      m.msg.selectedId ||
      m.msg.text ||
      (m.mtype == "listResponseMessage" &&
        m.msg.singleSelectReply.selectedRowId) ||
      (m.mtype == "buttonsResponseMessage" && m.msg.selectedButtonId) ||
      (m.mtype == "viewOnceMessage" && m.msg.caption) ||
      m.text;

    m.messageContextInfo = m.msg.contextInfo || {};

    let quoted = (m.quoted = m.msg.contextInfo
      ? m.msg.contextInfo.quotedMessage
      : null);
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
    if (m.quoted) {
      let type = Object.keys(m.quoted)[0];
      m.quoted = m.quoted[type];
      if (["productMessage"].includes(type)) {
        type = Object.keys(m.quoted)[0];
        m.quoted = m.quoted[type];
      }
      if (typeof m.quoted === "string") m.quoted = { text: m.quoted };
      m.quoted.mtype = type;
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBaileys = m.quoted.id
        ? (m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16) ||
          (m.quoted.id.startsWith("3EB0") &&
            (m.quoted.id.length === 22 || m.quoted.id.length === 40)) ||
          (m.quoted.id.startsWith("B1EY") && m.quoted.id.length === 20)
        : false;
      m.quoted.sender = client.decodeJid(m.msg.contextInfo.participant);
      m.quoted.fromMe =
        m.quoted.sender === client.decodeJid(client.user.id);
      m.quoted.text =
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.conversation ||
        m.quoted.contentText ||
        m.quoted.selectedDisplayText ||
        m.quoted.title ||
        "";

      // Add messageContextInfo to m.quoted
      m.quoted.messageContextInfo = m.msg.contextInfo || {};

      m.quoted.mentionedJid = m.msg.contextInfo
        ? m.msg.contextInfo.mentionedJid
        : [];
      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false;
        let q = await store.loadMessage(m.chat, m.quoted.id, client);
        return smsg(client, q, store);
      };
      let vM = (m.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }));
      m.quoted.delete = () =>
        client.sendMessage(m.quoted.chat, { delete: vM.key });
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
        client.copyNForward(jid, vM, forceForward, options);
      m.quoted.download = () => client.downloadMediaMessage(m.quoted);
    }
  }

  if (m.msg.url) m.download = () => client.downloadMediaMessage(m.msg);
  m.text =
    m.msg.text ||
    m.msg.caption ||
    m.message.conversation ||
    m.msg.contentText ||
    m.msg.selectedDisplayText ||
    m.msg.title ||
    m.msg.selectedId ||
    "";
  m.reply = (text, chatId = m.chat, options = {}) =>
    Buffer.isBuffer(text)
      ? client.sendMedia(chatId, text, "file", "", m, { ...options })
      : client.sendText(chatId, text, m, { ...options });
  m.copy = () => smsg(client, M.fromObject(M.toObject(m)));
  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
    client.copyNForward(jid, m, forceForward, options);
  client.appenTextMessage = async (text, chatUpdate) => {
    let messages = await generateWAMessage(
      m.chat,
      {
        text: text,
        mentions: m.mentionedJid,
      },
      {
        userJid: client.user.id,
        quoted: m.quoted && m.quoted.fakeObj,
      }
    );
    messages.key.fromMe = areJidsSameUser(m.sender, client.user.id);
    messages.key.id = m.key.id;
    messages.pushName = m.pushName;
    if (m.isGroup) messages.participant = m.sender;
    let msg = {
      ...chatUpdate,
      messages: [proto.WebMessageInfo.fromObject(messages)],
      type: "append",
    };
    client.ev.emit("messages.upsert", msg);
  };
  return m;
}

const question = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
};

async function ConnectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    `./${sessionName ? sessionName : "session"}`
  );
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() =>
    fetchLatestBaileysVersion()
  );
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
  const msgRetryCounterCache = new NodeCache();
  const client = WaSockets({
    logger: pino({ level: "silent" }),
    printQRInTerminal: global.login.useQr,
    browser: Browsers.windows("Firefox"),
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        message.templateMessage ||
        message.listMessage
      );
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...message,
            },
          },
        };
      }
      return message;
    },
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "fatal" }).child({ level: "fatal" })
      ),
    },
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg.message || undefined;
      }
      return {
        conversation: "Bot is online!",
      };
    },
    msgRetryCounterCache,
    defaultQueryTimeoutMs: undefined,
  });

  store.bind(client.ev);
  client.ev.on("creds.update", saveCreds);

  if (!global.login.useQr && !client.authState.creds.registered) {
    const phoneNumber = await question("Please enter your phone number\n~# ");
    console.log("Generating pairing code . . .");
    setTimeout(async () => {
      let code = await client.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log("Code:", code);
    }, 3000);
  }

  client.serializeM = (m) => smsg(client, m, store);
  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    try {
      if (connection === "close") {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

        switch (reason) {
          case DisconnectReason.badSession:
            console.log(
              "Bad Session File, Please Delete Session and Scan Again"
            );
            ConnectToWhatsApp();
            break;
          case DisconnectReason.connectionClosed:
            console.log("Connection closed, reconnecting....");
            ConnectToWhatsApp();
            break;
          case DisconnectReason.connectionLost:
            console.log("Connection Lost from Server, reconnecting...");
            ConnectToWhatsApp();
            break;
          case DisconnectReason.connectionReplaced:
            console.log(
              "Connection Replaced, Another New Session Opened, Please Close Current Session First"
            );
            ConnectToWhatsApp();
            break;
          case DisconnectReason.loggedOut:
            console.log(
              "Device Logged Out, Please Delete Session and Scan Again."
            );
            ConnectToWhatsApp();
            break;
          case DisconnectReason.restartRequired:
            console.log("Restart Required, Restarting...");
            ConnectToWhatsApp();
            break;
          case DisconnectReason.timedOut:
            console.log("Connection TimedOut, Reconnecting...");
            ConnectToWhatsApp();
            break;
          default:
            client.end(`Unknown DisconnectReason: ${reason}|${connection}`);
        }
      }

      if (update.connection === "connecting") {
        console.log("Connecting...");
      }

      if (update.connection === "open") {
        console.log(`Connected to: ${JSON.stringify(client.user, null, 2)}`);
      }
    } catch (err) {
      console.log("Error in Connection.update: " + err);
      ConnectToWhatsApp();
    }
  });

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      //console.log(JSON.stringify(chatUpdate, null, 2));
      mek = chatUpdate.messages[0];
      if (!mek.message) return;

      mek.message =
        Object.keys(mek.message)[0] === "ephemeralMessage"
          ? mek.message.ephemeralMessage.message
          : mek.message;

      if (mek.key && mek.key.remoteJid === "status@broadcast") return;
      if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify")
        return;
      if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;
      if (mek.key.id.startsWith("3EB0") && mek.key.id.length === 22) return;
      if (mek.key.id.startsWith("3EB0") && mek.key.id.length === 40) return;

      if (
        mek.message?.conversation ===
        "Waiting for this message. This may take a while."
      ) {
        console.log("Encrypted message detected waiting for decrypted . . .");
        await m.reply(
          "*Detected*\nDecrypted message with closed session!, Please wait a moment"
        );
        return;
      }

      m = smsg(client, mek, store);
      require("./handler")(client, m, chatUpdate, store);
    } catch (err) {
      console.log(err);
    }
  });

  // Handle error
  const unhandledRejections = new Map();
  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("rejectionHandled", (promise) => {
    unhandledRejections.delete(promise);
  });
  process.on("Something went wrong", function (err) {
    console.log("Caught exception: ", err);
  });

  // Setting
  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = client.decodeJid(contact.id);
      if (store && store.contacts)
        store.contacts[id] = { id, name: contact.notify };
    }
  });

  client.getName = (jid, withoutContact = false) => {
    id = client.decodeJid(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
        resolve(
          v.name ||
            v.subject ||
            PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
              "international"
            )
        );
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === client.decodeJid(client.user.id)
          ? client.user
          : store.contacts[id] || {};
    return (
      (withoutContact ? "" : v.name) ||
      v.subject ||
      v.verifiedName ||
      PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
        "international"
      )
    );
  };

  client.public = true;

  client.ev.on("messages.upsert", async (chatUpdate) => {
    if (global.setting.general.statusview.enable) {
      mek = chatUpdate.messages[0];
      if (mek.key && mek.key.remoteJid === "status@broadcast") {
        //console.log("Status viewed :", mek.key.remoteJid);
        function pickRandom(list) {
          return list[Math.floor(Math.random() * list.length)];
        }
        const saya = await client.decodeJid(client.user.id);
        await client.readMessages([mek.key]);
        if (mek.key.fromMe) return;
        await client
          .sendMessage(
            mek.key.remoteJid,
            {
              react: {
                text: `${pickRandom(global.setting.general.statusview.emoji)}`,
                key: mek.key,
              },
            },
            {
              statusJidList: [mek.key.participant, saya],
            }
          )
          .catch(() => {});
      }
    }
  });

  const getBuffer = async (url, options) => {
    try {
      options ? options : {};
      const res = await axios({
        method: "get",
        url,
        headers: {
          DNT: 1,
          "Upgrade-Insecure-Request": 1,
        },
        ...options,
        responseType: "arraybuffer",
      });
      return res.data;
    } catch (err) {
      return err;
    }
  };

  client.sendImage = async (jid, path, caption = "", quoted = "", options = {}) => {
    let buffer = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await await getBuffer(path)
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);
    return await client.sendMessage(
      jid,
      { image: buffer, caption: caption, ...options, ephemeralExpiration: WA_DEFAULT_EPHEMERAL },
      { quoted }
    );
  };

  client.sendReact = async (jid, emoji, key) => {
    return await client.sendMessage(jid, {
      react: {
        text: emoji,
        key: key,
      },
    });
  };

  client.sendText = (jid, text, quoted = "", options = {}) => {
    client.sendMessage(
      jid,
      {
        text: text,
        ...options,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
      },
      { quoted }
    );
  };

  client.cMod = (
    jid,
    copy,
    text = "",
    sender = client.user.id,
    options = {}
  ) => {
    //let copy = message.toJSON()
    let mtype = Object.keys(copy.message)[0];
    let isEphemeral = mtype === "ephemeralMessage";
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
    }
    let msg = isEphemeral
      ? copy.message.ephemeralMessage.message
      : copy.message;
    let content = msg[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== "string")
      msg[mtype] = {
        ...content,
        ...options,
      };
    if (copy.key.participant)
      sender = copy.key.participant = sender || copy.key.participant;
    else if (copy.key.participant)
      sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key.remoteJid.includes("@s.whatsapp.net"))
      sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes("@broadcast"))
      sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = sender === client.user.id;

    return proto.WebMessageInfo.fromObject(copy);
  };

  client.copyNForward = async (
    jid,
    message,
    forceForward = false,
    options = {}
  ) => {
    let vtype;
    if (options.readViewOnce) {
      message.message =
        message.message &&
        message.message.ephemeralMessage &&
        message.message.ephemeralMessage.message
          ? message.message.ephemeralMessage.message
          : message.message || undefined;
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete (message.message && message.message.ignore
        ? message.message.ignore
        : message.message || undefined);
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message,
      };
    }
    let mtype = Object.keys(message.message)[0];
    let content = await generateForwardMessageContent(message, forceForward);
    let ctype = Object.keys(content)[0];
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[ctype].contextInfo = {
      ...context,
      ...content[ctype].contextInfo,
    };
    const waMessage = await generateWAMessageFromContent(
      jid,
      content,
      options
        ? {
            ...content[ctype],
            ...options,
            ...(options.contextInfo
              ? {
                  contextInfo: {
                    ...content[ctype].contextInfo,
                    ...options.contextInfo,
                  },
                }
              : {}),
          }
        : {}
    );
    await client.relayMessage(jid, waMessage.message, {
      messageId: waMessage.key.id,
    });
    return waMessage;
  };

  client.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await await getBuffer(path)
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImg(buff, options);
    } else {
      buffer = await imageToWebp(buff);
    }
    await client
      .sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
      .then((response) => {
        fs.unlinkSync(buffer);
        return response;
      });
  };

  client.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await await getBuffer(path)
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVid(buff, options);
    } else {
      buffer = await videoToWebp(buff);
    }
    await client.sendMessage(
      jid,
      { sticker: { url: buffer }, ...options },
      { quoted }
    );
    return buffer;
  };

  client.downloadAndSaveMediaMessage = async (
    message,
    filename,
    attachExtension = true
  ) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype
      ? message.mtype.replace(/Message/gi, "")
      : mime.split("/")[0];

    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    let type = await FileType.fromBuffer(buffer);

    const trueFileName = attachExtension ? `${filename}.${type.ext}` : filename;

    const dir = path.join(__dirname, "temp");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const filePath = path.join(dir, trueFileName);
    await fs.writeFileSync(filePath, buffer);

    return filePath;
  };

  client.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype
      ? message.mtype.replace(/Message/gi, "")
      : mime.split("/")[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
  };

  return client;
}

ConnectToWhatsApp();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
