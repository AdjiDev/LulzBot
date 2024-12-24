const fs = require('fs')
const chalk = require('chalk')

// config.js
global.setting = {
  system: {
    owner: [''],
    botname: 'Lulz Bot',
    developer: 'AdjiDev',
    website: "https://google.com",
    default_limits: 120,
    prefix: ['!', '/']
  },

  general: {
    statusview: {
      enable: true,
      emoji: ['❄️']
    },

    autoread: {
      enable: false
    }
  },

  menu: {
    thumbnail: "https://th.bing.com/th/id/OIP.h_DmNKO5oz2njq4gp-WkvgHaEH?rs=1&pid=ImgDetMain",
    category: [
      "Admins",
      "Networking",
      "Ai",
      "Tools",
      "Groups",
      "Utility"
    ].sort((a, b) => {
      const nameA = a.replace(/[^a-zA-Z\s]/g, '').toLowerCase().trim(); 
      const nameB = b.replace(/[^a-zA-Z\s]/g, '').toLowerCase().trim();
      return nameA.localeCompare(nameB);
    })
  },
}

global.login = {
  useQr: false
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});