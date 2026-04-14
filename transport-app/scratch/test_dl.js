const https = require('https');
const fs = require('fs');

const downloadFile = (url, filename) => {
  const tempPath = filename;
  const file = fs.createWriteStream(tempPath);

  const options = {
    headers: {
        'User-Agent': 'TransportSystem/1.0'
    }
  };

  https.get(url, options, (response) => {
    console.log("Status:", response.statusCode);
    if (response.statusCode === 302 || response.statusCode === 301) {
      console.log("Redirecting to", response.headers.location);
      file.close();
      fs.unlink(tempPath, () => {});
      downloadFile(response.headers.location, filename);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`Server returned status ${response.statusCode}`);
      return;
    }

    response.pipe(file);

    response.on('end', () => {
      file.end();
      console.log('Finished');
    });

  }).on('error', (err) => {
    file.close();
    console.error(err.message);
  });
};

downloadFile('https://github.com/Prathamsharma2/Transport-app/releases/latest/download/tms-setup.exe', 'test_tms.exe');
