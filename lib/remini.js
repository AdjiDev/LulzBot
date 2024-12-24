const FormData = require("form-data");

async function remini(imageBuffer, action) {
    return new Promise(async (resolve, reject) => {
        const validActions = ["enhance", "recolor", "dehaze"];
        
        // Default to 'enhance' if the action is not valid
        action = validActions.includes(action) ? action : "enhance";
        
        const form = new FormData();
        const apiUrl = `https://inferenceengine.vyro.ai/${action}`;
        
        // Append image and required fields to the form data
        form.append("model_version", 1, { 
            "Content-Transfer-Encoding": "binary",
            contentType: "multipart/form-data; charset=utf-8" 
        });
        form.append("image", Buffer.from(imageBuffer), { 
            filename: "enhance_image_body.jpg",
            contentType: "image/jpeg" 
        });

        // Submit the form to the API
        form.submit({
            url: apiUrl,
            host: "inferenceengine.vyro.ai",
            path: `/${action}`,
            protocol: "https:",
            headers: {
                "User-Agent": "okhttp/4.9.3",
                "Connection": "Keep-Alive",
                "Accept-Encoding": "gzip"
            }
        }, (err, res) => {
            if (err) {
                return reject(err);
            }

            let chunks = [];
            
            // Collect the response data
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });

            // Resolve the promise once the response ends
            res.on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            // Handle any response errors
            res.on("error", (error) => {
                reject(error);
            });
        });
    });
}

module.exports.remini = remini;
