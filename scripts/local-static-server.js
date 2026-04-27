const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5000);
const root = path.resolve(process.cwd(), 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(root, normalizedPath);

  fs.stat(filePath, (statError, stat) => {
    if (!statError && stat.isFile()) {
      sendFile(res, filePath);
      return;
    }

    const htmlPath = filePath.endsWith('.html') ? filePath : `${filePath}.html`;
    fs.stat(htmlPath, (htmlError, htmlStat) => {
      if (!htmlError && htmlStat.isFile()) {
        sendFile(res, htmlPath);
        return;
      }

      sendFile(res, path.join(root, 'index.html'));
    });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local static server running at http://127.0.0.1:${port}`);
});
