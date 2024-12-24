const axios = require('axios');

const nodeToRegion = {
  ae1: 'United Arab Emirates',
  bg1: 'Bulgaria',
  br1: 'Brazil',
  ch1: 'Switzerland',
  cz1: 'Czech Republic',
  de1: 'Germany',
  de4: 'Germany',
  es1: 'Spain',
  fi1: 'Finland',
  fr2: 'France',
  hk1: 'Hong Kong',
  hr1: 'Croatia',
  il1: 'Israel',
  il2: 'Israel',
  in1: 'India',
  ir1: 'Iran',
  ir3: 'Iran',
  ir5: 'Iran',
  it2: 'Italy',
  jp1: 'Japan',
  kz1: 'Kazakhstan',
  lt1: 'Lithuania',
  md1: 'Moldova',
  nl1: 'Netherlands',
  nl2: 'Netherlands',
  pl1: 'Poland',
  pl2: 'Poland',
  pt1: 'Portugal',
  rs1: 'Serbia',
  ru1: 'Russia',
  ru2: 'Russia',
  ru3: 'Russia',
  se1: 'Sweden',
  tr1: 'Turkey',
  tr2: 'Turkey',
  ua1: 'Ukraine',
  ua2: 'Ukraine',
  ua3: 'Ukraine',
  uk1: 'United Kingdom',
  us1: 'United States',
  us2: 'United States',
  us3: 'United States',
};

async function getReportLink(url) {
  if (!url) {
    console.error('Usage: node check.js <url>');
    return;
  }

  try {
    const response = await axios.get(`https://check-host.net/check-http?host=${url}&max_nodes=43`, {
      headers: { Accept: 'application/json' },
    });

    const { request_id: requestId, permanent_link: reportLink } = response.data;
    console.log(`Check initiated. Request ID: ${requestId}`);
    console.log(`Permanent report link: ${reportLink}\n`);

    return { requestId, reportLink };
  } catch (error) {
    console.error('Failed to start HTTP check:', error.message);
  }
}

async function ssweb(url, device = 'desktop') {
  return new Promise((resolve, reject) => {
    const base = 'https://www.screenshotmachine.com';
    const param = {
      url: url,
      device: device,
      cacheLimit: 0,
    };

    axios({
      url: base + '/capture.php',
      method: 'POST',
      data: new URLSearchParams(Object.entries(param)),
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    })
      .then((data) => {
        const cookies = data.headers['set-cookie'];
        if (data.data.status === 'success') {
          axios
            .get(base + '/' + data.data.link, {
              headers: {
                cookie: cookies.join(''),
              },
              responseType: 'arraybuffer',
            })
            .then(({ data }) => {
              const result = {
                status: 200,
                result: data,
              };
              resolve(result);
            });
        } else {
          reject({ status: 404, statuses: `Link Error`, message: data.data });
        }
      })
      .catch(reject);
  });
}

async function CheckStatus(requestId, reportLink) {
  if (!requestId) {
    console.error('Request ID is required.');
    return;
  }

  try {
    console.log('Waiting for results...');
    await new Promise((resolve) => setTimeout(resolve, 20000));

    const resultResponse = await axios.get(`https://check-host.net/check-result/${requestId}`, {
      headers: { Accept: 'application/json' },
    });

    const resultData = resultResponse.data;

    let output = '';
    let rowNumber = 1;
    for (const [node, data] of Object.entries(resultData)) {
      if (Array.isArray(data) && data.length > 0) {
        for (const result of data) {
          if (result && result.length > 3) {
            const region = nodeToRegion[node.split('.')[0]];
            if (region) {
              const status = result[3];
              const responseTime = result[1] * 1000;
              const ipAddress = result[4];

              output += `${rowNumber}. Region: ${region}, Status: ${status}, IP Address: ${ipAddress}, Response Time: ${responseTime.toFixed(2)} ms\n`;
              rowNumber++;
            }
          }
        }
      }
    }

    if (output) {
      console.log(output);

      // Generate screenshot of the report link
      if (reportLink) {
        console.log('Generating screenshot of the report link...');
        const screenshot = await ssweb(reportLink);
        if (screenshot.status === 200) {
          console.log('Screenshot generated successfully.');
        } else {
          console.log('Failed to generate screenshot.');
        }
      }
    } else {
      console.log('No valid results found.');
    }
  } catch (error) {
    console.error('Failed to retrieve results:', error.message);
  }
}

module.exports = { getReportLink, CheckStatus, ssweb };
