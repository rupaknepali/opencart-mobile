#!/usr/bin/env node
/**
 * Renders the app icon, Android adaptive icon foreground and splash image into
 * mobile/assets/ with headless Chrome. Edit COLOR / ICON below to rebrand.
 *
 *   node scripts/build-icons.cjs
 *
 * CHROME=/path/to/chrome overrides the default macOS Google Chrome location.
 * Needs internet access for Bootstrap Icons.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const COLOR = '#1f6feb';
const COLOR2 = '#1550b8';
const ICON = 'bi-bag-check-fill'; // https://icons.getbootstrap.com/

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(chrome)) {
  console.error(`Chrome not found at ${chrome}. Set CHROME=/path/to/chrome.`);
  process.exit(1);
}

const page = (body, bg) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1024px;height:1024px;overflow:hidden;background:${bg}}
.c{width:1024px;height:1024px;display:grid;place-items:center}</style></head><body>${body}</body></html>`;

const assets = [
  {
    // iOS / generic icon: full-bleed, no transparency (the OS applies the rounded mask)
    file: 'icon.png',
    transparent: false,
    html: page(
      `<div class="c" style="background:linear-gradient(145deg, ${COLOR}, ${COLOR2})"><i class="bi ${ICON}" style="font-size:560px;color:#fff;line-height:1"></i></div>`,
      COLOR,
    ),
  },
  {
    // Android adaptive icon foreground: transparent, artwork inside the central ~66 % safe zone
    file: 'adaptive-icon.png',
    transparent: true,
    html: page(`<div class="c"><i class="bi ${ICON}" style="font-size:420px;color:#fff;line-height:1"></i></div>`, 'transparent'),
  },
  {
    // Splash image shown centred on the splash background colour
    file: 'splash-icon.png',
    transparent: true,
    html: page(
      `<div class="c"><div style="width:520px;height:520px;border-radius:120px;display:grid;place-items:center;background:linear-gradient(145deg, ${COLOR}, ${COLOR2})"><i class="bi ${ICON}" style="font-size:300px;color:#fff;line-height:1"></i></div></div>`,
      'transparent',
    ),
  },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-icons-'));
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
try {
  for (const a of assets) {
    const html = path.join(tmp, a.file + '.html');
    fs.writeFileSync(html, a.html);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1024,1024',
      '--virtual-time-budget=8000',
    ];
    if (a.transparent) args.push('--default-background-color=00000000');
    args.push(`--screenshot=${path.join(outDir, a.file)}`, 'file://' + html);
    execFileSync(chrome, args, { stdio: 'ignore' });
    console.log(`Built assets/${a.file}`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
