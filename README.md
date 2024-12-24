# Lulz Bot
Just simple whatsapp bot made in baileys

## DETAIL
- Baileys used
> [AdjiDev Baileys](https://github.com/adjidev/baileys)

- Database used
> [SQLite](https://sqlite.org)

## Requirements
- FFMPEG
- NODEJS 18 or later

## HOW TO INSTALL
- First edit the `config.js` 
```javacript
system: {
    owner: ['123456789'], //owner
    botname: 'Lulz Bot', //Botname
    developer: 'AdjiDev', //author/dev
    website: "https://google.com", //optional
    default_limits: 120, //user limits
    prefix: ['!', '/'] //default prefix, no prefix the bot will not works! 
  },
```
- Install the required `modules`
```powershell
npm install
```
- Then start the bot 
```powershell
npm start
```