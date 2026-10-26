const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
http.createServer((request, response) => {
  if (!['/', '/tray-prototype.html'].includes(request.url?.split('?')[0])) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const file = path.join(__dirname, 'tray-prototype.html');
  if (!fs.existsSync(file)) { response.writeHead(503); response.end('Design em preparo.'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(4174, '127.0.0.1', () => console.log('Protótipo de UX: http://127.0.0.1:4174'));
