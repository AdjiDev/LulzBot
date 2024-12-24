const { getReportLink } = require('../lib/check-host');

module.exports = {
    name: ["checkhost", "checkweb"],
    description: "Check website status.",
    category: ["Utility"],
    limit: 1,
    async execute(m, { client, args }) {
        if (args.length < 1) {
            return m.reply("Please provide a URL to check. Usage: !checkhost <url>");
        }

        const url = args[0];

        try {
            const { requestId, reportLink } = await getReportLink(url);
            m.reply(`Report ID: ${requestId}\nProof: ${reportLink}`);
        } catch (error) {
            m.reply(`Failed to check website status: ${error.message}`);
        }
    },
};
