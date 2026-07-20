// Generates preview.html — a self-contained copy of index.html with the
// local font files and logo image inlined as base64 data URIs, purely so
// it can be published as a single-file Artifact preview. The real
// deliverable to deploy is index.html (with the ./fonts and ./assets
// folders alongside it).
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function toDataUri(relPath, mime) {
  const buf = fs.readFileSync(path.join(root, relPath));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const fonts = {
  './fonts/Expo_Arabic_Light-Cmk8w8K1.woff2': 'font/woff2',
  './fonts/Expo_Arabic_Medium-B7WliHSW.woff2': 'font/woff2',
  './fonts/Expo_Arabic_Semibold-DjD7hrvy.woff2': 'font/woff2',
  './fonts/Expo_Arabic_Bold-gMswv_yR.woff2': 'font/woff2',
};

for (const [rel, mime] of Object.entries(fonts)) {
  const uri = toDataUri(rel, mime);
  html = html.split(`url('${rel}')`).join(`url('${uri}')`);
}

const logoUri = toDataUri('./assets/logo.png', 'image/png');
html = html.split('./assets/logo.png').join(logoUri);

const MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};
const clientsDir = path.join(root, 'clients');
if (fs.existsSync(clientsDir)) {
  for (const file of fs.readdirSync(clientsDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!MIME_BY_EXT[ext]) continue;
    const relSrc = './clients/' + file.split('/').map(encodeURIComponent).join('/');
    const uri = toDataUri(path.join('clients', file), MIME_BY_EXT[ext]);
    html = html.split(`src="${relSrc}"`).join(`src="${uri}"`);
  }
}

fs.writeFileSync(path.join(root, 'preview.html'), html);
console.log('preview.html written, size:', fs.statSync(path.join(root, 'preview.html')).size);
