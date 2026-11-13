#!/usr/bin/env node
/**
 * Renders the featured images for the 5-part WordPress series
 * (docs/featured-images/part-1.png … part-5.png, 1200 × 630) with headless Chrome.
 *
 *   node docs/featured-images/build.cjs
 *
 * CHROME=/path/to/chrome overrides the default macOS Google Chrome location.
 * Needs internet access for the Inter font and Bootstrap Icons.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(chrome)) {
  console.error(`Chrome not found at ${chrome}. Set CHROME=/path/to/chrome.`);
  process.exit(1);
}

const PARTS = [
  {
    title: 'Overview, Architecture, Repository Layout and Languages',
    sections: ['What this project is', 'Architecture', 'Repository layout', 'Languages'],
    icon: 'bi-diagram-3',
    accent: '#3b82f6',
    accent2: '#22d3ee',
  },
  {
    title: 'Tools and Libraries, Why Expo, and the Development Environment',
    sections: ['Tools and libraries', 'Why Expo', 'Development environment'],
    icon: 'bi-tools',
    accent: '#8b5cf6',
    accent2: '#ec4899',
  },
  {
    title: 'The OpenCart Extension and the Mobile App',
    sections: ['The mobile_api extension', 'The mobile app'],
    icon: 'bi-plug',
    accent: '#10b981',
    accent2: '#84cc16',
  },
  {
    title: 'Design Patterns, Hooks and End-to-End Flows',
    sections: ['Design patterns', 'Hooks', 'Flows, end to end'],
    icon: 'bi-signpost-split',
    accent: '#f59e0b',
    accent2: '#ef4444',
  },
  {
    title: 'Configuration, Security, Extending, Testing, Releasing and Troubleshooting',
    sections: ['Configuration', 'Security', 'Extending', 'Testing', 'Releasing', 'Troubleshooting'],
    icon: 'bi-shield-check',
    accent: '#06b6d4',
    accent2: '#6366f1',
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Layout is centred and crop-safe: themes crop featured images to 16:9, 3:2, 4:3 or
// even square. Everything readable sits in the middle ~760 px; only the decorative
// phones sit near the edges, where cropping doesn't matter.
function phone(p, side) {
  return `<div class="phone ${side}"><div class="screen">
  <div class="bar"></div><div class="notch"></div>
  <div class="search"></div>
  <div class="banner"></div>
  <div class="cards">${'<div class="card"><div class="img"></div><div class="l1"></div><div class="l2"></div></div>'.repeat(4)}</div>
  <div class="tabbar"><i class="bi bi-house-fill on"></i><i class="bi bi-grid"></i><i class="bi bi-cart"></i><i class="bi bi-heart"></i><i class="bi bi-person"></i></div>
</div></div>`;
}

function html(p, n) {
  const dots = PARTS.map((_, i) => `<span class="dot${i + 1 === n ? ' on' : ''}"></span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@500&display=block">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: Inter, system-ui, sans-serif; color: #fff; position: relative;
    background:
      radial-gradient(620px 420px at 50% 42%, ${p.accent}40, transparent 70%),
      radial-gradient(500px 400px at 100% 0%, ${p.accent2}38, transparent 65%),
      radial-gradient(500px 400px at 0% 100%, ${p.accent}30, transparent 65%),
      linear-gradient(135deg, #0b1220 0%, #111a2e 55%, #0b1220 100%);
  }
  .grid { position: absolute; inset: 0; opacity: .07;
    background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);
    background-size: 40px 40px; }

  .center { position: absolute; left: 220px; right: 220px; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .series { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 600; letter-spacing: .02em; color: #cbd5e1; }
  .series .chip { font-family: 'JetBrains Mono', monospace; font-size: 14px; padding: 4px 9px; border-radius: 8px; background: ${p.accent}33; color: #fff; border: 1px solid ${p.accent}88; }
  .badge { margin-top: 26px; width: 92px; height: 92px; border-radius: 26px; display: grid; place-items: center;
    background: linear-gradient(135deg, ${p.accent}, ${p.accent2}); box-shadow: 0 18px 40px ${p.accent}66; }
  .badge i { font-size: 46px; color: #fff; }
  .part { margin-top: 22px; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
    background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); -webkit-background-clip: text; color: transparent; }
  h1 { margin-top: 10px; font-size: ${p.title.length > 60 ? 40 : 46}px; line-height: 1.14; font-weight: 800; letter-spacing: -.02em; max-width: 760px; }
  .tags { margin-top: 26px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 720px; }
  .tag { font-size: 15px; font-weight: 600; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); color: #e2e8f0; }
  .dots { margin-top: 26px; display: flex; gap: 8px; }
  .dot { width: 24px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.18); }
  .dot.on { background: linear-gradient(90deg, ${p.accent}, ${p.accent2}); width: 48px; }

  /* decorative phones at the edges */
  .phone { position: absolute; top: 95px; width: 230px; height: 450px; border-radius: 38px; padding: 10px;
    background: linear-gradient(160deg, #1f2937, #0f172a); border: 2px solid rgba(255,255,255,.16);
    box-shadow: 0 40px 80px rgba(0,0,0,.55); opacity: .9; }
  .phone.left { left: -20px; transform: rotate(-10deg); }
  .phone.right { right: -20px; transform: rotate(10deg); }
  .screen { width: 100%; height: 100%; border-radius: 28px; overflow: hidden; background: #f6f7f9; position: relative; }
  .notch { position: absolute; top: 7px; left: 50%; transform: translateX(-50%); width: 72px; height: 20px; border-radius: 11px; background: #0b1220; }
  .bar { height: 62px; background: linear-gradient(135deg, ${p.accent}, ${p.accent2}); }
  .search { margin: -16px 12px 0; height: 32px; border-radius: 9px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.12); }
  .banner { margin: 12px; height: 78px; border-radius: 12px; background: linear-gradient(120deg, ${p.accent}33, ${p.accent2}33); }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 0 12px; }
  .card { height: 102px; border-radius: 11px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.06); padding: 7px; }
  .card .img { height: 54px; border-radius: 7px; background: #e9edf3; }
  .card .l1 { margin-top: 7px; height: 7px; width: 80%; border-radius: 4px; background: #d5dbe4; }
  .card .l2 { margin-top: 5px; height: 7px; width: 45%; border-radius: 4px; background: ${p.accent}; }
  .tabbar { position: absolute; left: 0; right: 0; bottom: 0; height: 46px; background: #fff; border-top: 1px solid #e4e7ec; display: flex; justify-content: space-around; align-items: center; }
  .tabbar i { font-size: 17px; color: #98a2b3; }
  .tabbar i.on { color: ${p.accent}; }
</style></head><body>
<div class="grid"></div>
${phone(p, 'left')}
${phone(p, 'right')}
<div class="center">
  <div class="series"><span class="chip">&lt;/&gt;</span> OpenCart Mobile App · Developer Guide</div>
  <div class="badge"><i class="bi ${p.icon}"></i></div>
  <div class="part">Part ${n} of ${PARTS.length}</div>
  <h1>${esc(p.title)}</h1>
  <div class="tags">${p.sections.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
  <div class="dots">${dots}</div>
</div>
</body></html>`;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-featured-'));
try {
  PARTS.forEach((p, i) => {
    const n = i + 1;
    const page = path.join(tmp, `part-${n}.html`);
    const png = path.join(__dirname, `part-${n}.png`);
    fs.writeFileSync(page, html(p, n));
    execFileSync(
      chrome,
      ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=8000', `--screenshot=${png}`, 'file://' + page],
      { stdio: 'ignore' },
    );
    console.log(`Built ${png}`);
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
