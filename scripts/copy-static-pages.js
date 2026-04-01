const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const staticDir = path.join(root, 'web-static');

if (!fs.existsSync(distDir) || !fs.existsSync(staticDir)) {
  process.exit(0);
}

for (const fileName of fs.readdirSync(staticDir)) {
  const source = path.join(staticDir, fileName);
  const target = path.join(distDir, fileName);
  fs.copyFileSync(source, target);
}
