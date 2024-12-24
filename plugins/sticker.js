const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

async function convertToWebp(imagePath, outputPath) {
  try {
    await sharp(imagePath)
      .webp()
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to convert image to WebP: ${error.message}`);
  }
}

async function getVideoDimensions(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) {
        reject(new Error(`Failed to get video dimensions: ${error.message}`));
      } else {
        const { width, height } = metadata.streams[0];
        resolve({ width, height });
      }
    });
  });
}

async function convertVideoToWebp(videoPath, outputPath) {
  const { width, height } = await getVideoDimensions(videoPath);
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        "-vcodec libwebp",
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,fps=30`,
        "-lossless 1",
        "-compression_level 6",
        "-preset default",
        "-loop 0",
        "-an",
        "-vsync 0"
      ])
      .toFormat("webp")
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (error) => reject(new Error(`Failed to convert video to WebP: ${error.message}`)));
  });
}

module.exports = {
  name: ["s", "sticker"],
  description: "Convert image/gif/video to webp",
  category: ["Tools"],
  limit: 1,
  async execute(m, { client, mime, qmsg }) {
    try {
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const mediaPath = await client.downloadAndSaveMediaMessage(qmsg);
      const outputFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);

      if (/image/.test(mime)) {
        await convertToWebp(mediaPath, outputFilePath);
      } else if (/video/.test(mime) || /gif/.test(mime)) {
        await convertVideoToWebp(mediaPath, outputFilePath);
      } else {
        return m.reply("Please send a valid image (jpg, png) or gif/video to convert to a sticker.");
      }

      await client.sendMessage(
        m.chat,
        { sticker: fs.readFileSync(outputFilePath) }, 
        { quoted: m }
      );

      fs.unlinkSync(mediaPath);
      fs.unlinkSync(outputFilePath);

    } catch (error) {
      console.error("Error processing sticker:", error);
      return m.reply(`Process failed!\n\nReason:\n\n${error.message}`);
    }
  },
};
