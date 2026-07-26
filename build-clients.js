// Scans ./clients for image files and regenerates the "شركاؤنا" logo-cloud
// markup in index.html between the CLIENTS:START / CLIENTS:END markers.
//
// Run this again any time logo files are added to or removed from
// /clients — nothing else in index.html needs to change by hand.
//
//   node build-clients.js
//
const fs = require('fs');
const path = require('path');

const root = __dirname;
const clientsDir = path.join(root, 'clients');
const indexPath = path.join(root, 'index.html');

// .webp is deliberately excluded: this generator only treats it as a
// derived <picture> sibling of a .png/.jpg/.jpeg source (see cardHtml),
// never as a primary client logo file on its own.
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];

// industry badge per logo file — extend this as new client files are added.
// files with no entry here simply render without a badge.
const CATEGORY_BY_FILE = {
  '1626132081_alfahad.png': '⌚ ساعات فاخرة',
  '581759442_122111506119035588_3983094537228221383_n.jpg': '💰 منتجات رقمية ومالية',
  '619802479_857537470617049_8156391552720329706_n.jpg': '📚 كتب وروايات',
  '631068297_122096794419259995_4534826695669284242_n.jpg': '🌍 تعليم لغات',
  '685a27b7feef7321c9fe6c75b4b230aa.jpeg': '🥗 مواد غذائية',
  '7777bb7e1cd7abb10a933013c934269f.jpg': '🍽️ مطعم',
  '897d29b33e15338b2839280fad463b9a.png': '🎓 دورات تعليمية',
  'Artboard 1 copy 3.png': '💻 برمجيات وتطبيقات',
  'Copy of logo 3.jpg': '💼 خدمات استشارية',
  'channels4_profile.jpg': '🥤 مشروبات',
};

const files = fs.readdirSync(clientsDir)
  .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (files.length === 0) {
  console.error('No image files found in /clients — leaving index.html untouched.');
  process.exit(1);
}

// Reads intrinsic width/height from PNG/JPEG headers so the generated
// <img> tags can carry explicit width/height attributes. Without those,
// the browser doesn't know an image's box size until its bytes finish
// decoding — and since the marquee measures each row's rendered width
// on script start to compute its seamless-loop period, an image that's
// still loading at that moment makes the measurement too small, which
// is what caused the top row's loop to visibly stall/jump before.
function readImageSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    // PNG: width/height are big-endian uint32 at offset 16/20
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    // JPEG: scan markers for the first SOFn segment
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const segLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segLength;
    }
  }
  return null;
}

// split into two rows, as even as possible
const rowA = [];
const rowB = [];
files.forEach((f, i) => {
  (i % 2 === 0 ? rowA : rowB).push(f);
});

// the full logo sequence is repeated this many times, back-to-back, in
// one flat track — never nested. The CSS animation moves
// the whole track by exactly 1/REPEATS of its own width (see
// logo-scroll-a/b keyframes below, kept in sync with this constant),
// so the browser's own layout engine loops it with zero JS measurement
// and zero risk of the track running out of content on wide screens.
const REPEATS = 4;

function cardHtml(file) {
  const src = './clients/' + file.split('/').map(encodeURIComponent).join('/');
  const badge = CATEGORY_BY_FILE[file];
  const badgeHtml = badge
    ? `\n              <span class="logo-badge">${badge}</span>`
    : '';
  const size = readImageSize(path.join(clientsDir, file));
  const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
  const webpFile = file.replace(/\.[^.]+$/, '.webp');
  const hasWebp = file.toLowerCase() !== webpFile.toLowerCase()
    && fs.existsSync(path.join(clientsDir, webpFile));
  const webpSrc = './clients/' + webpFile.split('/').map(encodeURIComponent).join('/');
  const img = `<img src="${src}"${dims} alt="شعار أحد عملاء حاسب" loading="lazy" />`;
  const picture = hasWebp
    ? `<picture><source srcset="${webpSrc}" type="image/webp" />${img}</picture>`
    : img;
  return (
    `            <div class="logo-card">\n` +
    `              <span class="logo-img-wrap">${picture}</span>` +
    badgeHtml + `\n` +
    `            </div>\n`
  );
}

function setHtml(rowFiles, hidden) {
  const attr = hidden ? ' aria-hidden="true"' : '';
  return `          <div class="logo-set"${attr}>\n` + rowFiles.map(cardHtml).join('') + '          </div>\n';
}

function trackHtml(rowFiles, trackId) {
  let out = `        <div class="logo-track" id="${trackId}">\n`;
  for (let i = 0; i < REPEATS; i++) {
    out += setHtml(rowFiles, i > 0);
  }
  out += '        </div>\n';
  return out;
}

const generated =
  '    <div class="logo-marquee" data-reveal>\n' +
  '      <div class="logo-row" id="logoRowA">\n' +
  trackHtml(rowA, 'logoTrackA') +
  '      </div>\n' +
  '      <div class="logo-row" id="logoRowB">\n' +
  trackHtml(rowB, 'logoTrackB') +
  '      </div>\n' +
  '    </div>\n';

let html = fs.readFileSync(indexPath, 'utf8');
const startMarker = '<!-- CLIENTS:START -->';
const endMarker = '<!-- CLIENTS:END -->';
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
  console.error('CLIENTS:START / CLIENTS:END markers not found in index.html');
  process.exit(1);
}

html =
  html.slice(0, startIdx + startMarker.length) +
  '\n' + generated +
  html.slice(endIdx);

fs.writeFileSync(indexPath, html);
console.log(`Clients section regenerated: ${files.length} logos (${rowA.length} row A / ${rowB.length} row B), ${REPEATS}x repeated per row in one flat track.`);
