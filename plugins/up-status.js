function generateRandomHexColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
}

module.exports = {
  name: ["upstatus", "upsw"],
  description: "Up whatsapp status",
  category: ["Admins"],
  limit: 1,
  async execute(m, { client, quoted, isOwner, mime, store }) {
    try {
      if (!isOwner)
        return m.reply("You don't have permission to use this command.");

      //image
      if (/image/.test(mime)) {
        var imagesw = await client.downloadAndSaveMediaMessage(quoted);
        await client.sendMessage(
          "status@broadcast",
          {
            image: { url: imagesw },
            caption: q ? q : "",
          },
          {
            statusJidList: Object.keys(store.contacts).map(
              (key) => store.contacts[key].id
            ),
          }
        );
        m.reply("Image status uploaded successfully!");

      // video
      } else if (/video/.test(mime)) {
        var videosw = await client.downloadAndSaveMediaMessage(quoted);
        await client.sendMessage(
          "status@broadcast",
          {
            video: { url: videosw },
            caption: q ? q : "",
          },
          {
            statusJidList: Object.keys(store.contacts).map(
              (key) => store.contacts[key].id
            ),
          }
        );
        m.reply("Video status uploaded successfully!");

      // audio
      } else if (/audio/.test(mime)) {
        var audiosw = await client.downloadAndSaveMediaMessage(quoted);
        await client.sendMessage(
          "status@broadcast",
          {
            audio: { url: audiosw },
            mimetype: "audio/mp4",
            ptt: true,
          },
          {
            backgroundColor: "#000000",
            statusJidList: Object.keys(store.contacts).map(
              (key) => store.contacts[key].id
            ),
          }
        );
        m.reply("Audio status uploaded successfully!");

      // text
      } else if (!q) {
        await client.sendMessage(
          "status@broadcast",
          { text: m.quoted.text },
          {
            backgroundColor: generateRandomHexColor(),
            font: 3,
            statusJidList: Object.keys(store.contacts).map(
              (key) => store.contacts[key].id
            ),
          }
        );
        await m.reply("Success")
      } else {
        m.reply("Quoted any message except view once message");
      }
    } catch (error) {
      console.error("Error uploading status:", error);
      m.reply("An error occurred while uploading the status.");
    }
  },
};

// Ekspor fungsi jika perlu digunakan di modul lain
module.exports.generateRandomHexColor = generateRandomHexColor;
