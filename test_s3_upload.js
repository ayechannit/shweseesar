const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'shweseesar2026!';
const token = jwt.sign({ id: 1, role: 'Admin' }, JWT_SECRET);

console.log('Generated Token:', token);

// Create a dummy file
const filePath = path.join(__dirname, 'test_upload.txt');
fs.writeFileSync(filePath, 'This is a test upload for S3 integration.');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const data = fs.readFileSync(filePath);

const postData = 
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="test_upload.txt"\r\n` +
  `Content-Type: text/plain\r\n\r\n` +
  data + `\r\n` +
  `--${boundary}--\r\n`;

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/investigations/32/upload',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
    // Cleanup
    fs.unlinkSync(filePath);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
