const http = require('http');
const fs = require('fs');
const path = require('path');

http.get('http://localhost:5000/api/ping', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync(path.join(__dirname, 'ping_result.log'), `STATUS: ${res.statusCode}\nBODY: ${data}\n`);
  });
}).on('error', (err) => {
  fs.writeFileSync(path.join(__dirname, 'ping_result.log'), `ERROR: ${err.message}\n`);
});
