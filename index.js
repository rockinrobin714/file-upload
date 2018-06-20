const fs = require('fs');
const url = require('url');
const axios = require('axios');

let fileUrl = process.argv[2],
    downloadDir = process.argv[3] || './downloads/',
    numChunks = process.argv[4] || 4,
    chunkSize = process.argv[5] || 1048576,
    fileName = url.parse(fileUrl).pathname.split('/').pop();

// Create directory if it doesn't exist.
if (!fs.existsSync(downloadDir)) {
  console.info(`Creating ${downloadDir} folder.`);
  fs.mkdirSync(downloadDir);
}

console.info('Initiating download')
// Get the header so we can determine how large the file is before we request it.
axios.head(fileUrl)
  .then(res => {
    // Return the content length
    return parseInt(res.headers['content-length']);
  })
  .then(length => {
    // If the file is smaller than 4 bytes, adjust accordingly
    let maxFileSize = Math.min(length, numChunks * chunkSize);
    if (maxFileSize === length) {
        chunkSize = Math.ceil(length / numChunks);
    }
    // Create an array of empty strings to map over
    const downloadBuffer = Array(numChunks).fill('')
      .map((_, index) => {
        console.info('.'.repeat(index + 1));
        return axios.get(fileUrl, {
          responseType: 'arraybuffer',
          headers: {
            Range: `bytes=${index * chunkSize}-${(index * chunkSize) + chunkSize}`
          },
        })
      })
      // We need to wait until all of the requests are finished before we can concat them together
      return Promise.all(downloadBuffer);
  })
  .then(chunks => {
    return Buffer.concat(chunks.map(chunk => {
      return chunk.data;
    }));
  })
  .then(buffer => {
    if (fs.existsSync(downloadDir + fileName)) {
      fs.unlinkSync(downloadDir + fileName);
    }
    fs.writeFileSync(downloadDir + fileName, buffer);
    console.info(fileName + ' downloaded to ' + downloadDir);
  })
  .catch(err => {
    console.error(err);
  })
