const fs = require('fs');
const path = require('path');

const root = process.cwd();
const output = path.join(root, 'public');

const entries = [
  'contents',
  'audio',
  'css',
  'dark',
  'fonts',
  'images',
  'js',
  'light',
  'php',
  'skins',
  'video',
  'about.html',
  'account.html',
  'auction.html',
  'blog-detail-with-lhs.html',
  'blog-detail-with-rhs.html',
  'blog-detail.html',
  'blog.html',
  'buttons.html',
  'columns.html',
  'contact.html',
  'favicon.ico',
  'gallery-detail-with-lhs.html',
  'gallery-detail-with-rhs.html',
  'gallery-detail.html',
  'gallery.html',
  'index.html',
  'progressbar.html',
  'robots.txt',
  'shop-cart.html',
  'shop-checkout.html',
  'shop-detail.html',
  'shop.html',
  'sitemap.xml',
  'site.webmanifest',
  'style.css',
  'tabs.html',
  'typography.html',
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;

  const destination = path.join(output, entry);
  copyEntry(source, destination);
}

console.log(`Static site copied to ${path.relative(root, output)}`);

function copyEntry(source, destination) {
  const stats = fs.statSync(source);

  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyEntry(path.join(source, child), path.join(destination, child));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
