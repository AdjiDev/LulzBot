const axios = require("axios");
const cheerio = require("cheerio");

const clean = (data) => {
  let regex = /(<([^>]+)>)/gi;
  data = data.replace(/(<br?\s?\/>)/gi, " \n");
  return data.replace(regex, "");
};

async function shortener(url) {
  return url;
}

exports.Tiktok = async (query) => {
  try {
    const response = await axios("https://lovetik.com/api/ajax/search", {
      method: "POST",
      data: new URLSearchParams(Object.entries({ query })),
    });

    const result = {};
    result.creator = "YNTKTS";
    result.title = clean(response.data.desc);
    result.author = clean(response.data.author);
    result.thumbnail = await shortener(response.data.cover);

    const links = [
      (response.data.links[0].a || "").replace("https", "http"), //Tanpa watermark
      (response.data.links[1].a || "").replace("https", "http"), //Dengan watermark
      (response.data.links[2].a || "").replace("https", "http")  //Audio
    ];

    const [nowm, watermark, audio] = await Promise.all(links.map(link => shortener(link)));

    result.nowm = nowm;
    result.watermark = watermark;
    result.audio = audio;

    return result;
  } catch (error) {
    console.error(`Error fetching TikTok data: ${error.message}`);
    throw error;
  }
}
