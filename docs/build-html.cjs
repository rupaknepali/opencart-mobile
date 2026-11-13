#!/usr/bin/env node
/**
 * Builds docs/developer-guide.html (Bootstrap 5) from docs/DEVELOPER.md.
 *
 * DEVELOPER.md stays the source of truth: edit it, then run
 *
 *   cd docs && npm ci && npm run build:html
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const src = path.join(__dirname, 'DEVELOPER.md');
const out = path.join(__dirname, 'developer-guide.html');

let md = fs.readFileSync(src, 'utf8');

// The sidebar replaces the in-document table of contents.
md = md.replace(/\n## Contents\n[\s\S]*?\n---\n/, '\n');

// GitHub-style heading ids, so the guide's own #anchor links keep working.
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/ /g, '-');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toc = [];
let title = 'Developer Guide';
let intro = '';

marked.use({
  gfm: true,
  renderer: {
    heading({ tokens, depth, text }) {
      const html = this.parser.parseInline(tokens);
      const plain = text.replace(/`/g, '');
      if (depth === 1) {
        title = plain;
        return '';
      }
      const id = slug(plain);
      if (depth === 2 || depth === 3) toc.push({ depth, id, text: plain });
      const anchor = depth <= 3 ? `<a class="anchor-link" href="#${id}" aria-label="Link to this section">#</a>` : '';
      return `<h${depth} id="${id}">${html}${anchor}</h${depth}>\n`;
    },
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<div class="diagram card card-body mb-4"><pre class="mermaid" data-src="${esc(text)}">${esc(text)}</pre></div>\n`;
      }
      const map = { tsx: 'typescript', ts: 'typescript', jsonc: 'json', sh: 'bash' };
      const language = lang ? map[lang] || lang : 'plaintext';
      return `<div class="code-block position-relative mb-4"><button type="button" class="btn btn-sm btn-outline-secondary copy-btn">Copy</button><pre><code class="language-${language}">${esc(text)}</code></pre></div>\n`;
    },
    table(token) {
      const header = token.header.map((c) => `<th scope="col">${this.parser.parseInline(c.tokens)}</th>`).join('');
      const rows = token.rows
        .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
        .join('\n');
      return `<div class="table-responsive mb-4"><table class="table table-sm table-striped table-hover align-middle"><thead class="table-light"><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    },
    blockquote({ tokens }) {
      return `<div class="alert alert-info">${this.parser.parse(tokens)}</div>\n`;
    },
    hr() {
      return '';
    },
  },
});

let body = marked.parse(md);

// The text before the first section becomes the page lead.
const firstH2 = body.indexOf('<h2');
intro = body.slice(0, firstH2);
body = body.slice(firstH2);

// Wrap each h2 section in a <section> so scrollspy and spacing work per section.
body = body
  .split(/(?=<h2 )/)
  .map((s) => `<section class="doc-section">\n${s}</section>\n`)
  .join('');

// Task list checkboxes
body = body.replace(/<input (checked="" )?disabled="" type="checkbox">/g, (m, c) => `<input class="form-check-input me-2" type="checkbox" ${c ? 'checked' : ''}>`);

const tocHtml = (() => {
  let html = '';
  let open = false;
  for (const item of toc) {
    if (item.depth === 2) {
      if (open) html += '</nav>';
      html += `<a class="nav-link toc-h2" href="#${item.id}">${esc(item.text)}</a><nav class="nav flex-column toc-sub">`;
      open = true;
    } else {
      html += `<a class="nav-link toc-h3" href="#${item.id}">${esc(item.text)}</a>`;
    }
  }
  if (open) html += '</nav>';
  return html;
})();

const built = new Date().toISOString().slice(0, 10);

const page = `<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Developer guide for the OpenCart 4.1.0.4 mobile app and its Mobile App API extension.">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<link rel="stylesheet" id="hljs-light" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css">
<link rel="stylesheet" id="hljs-dark" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github-dark.min.css" disabled>
<style>
  :root { --doc-sidebar-width: 300px; }
  html { scroll-padding-top: 5rem; }
  body { background: var(--bs-body-bg); overflow-x: hidden; }
  .navbar > .container-fluid { flex-wrap: nowrap; }
  .navbar-brand { min-width: 0; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  main { min-width: 0; }
  .code-block pre { overflow-x: auto; }
  .navbar-brand small { font-weight: 400; opacity: .75; }
  .doc-sidebar { position: sticky; top: 4.5rem; height: calc(100vh - 5.5rem); overflow-y: auto; }
  .doc-sidebar .nav-link { padding: .2rem .75rem; color: var(--bs-secondary-color); border-left: 2px solid transparent; font-size: .9rem; }
  .doc-sidebar .toc-h2 { color: var(--bs-body-color); font-weight: 600; margin-top: .35rem; }
  .doc-sidebar .toc-h3 { padding-left: 1.5rem; font-size: .84rem; }
  .doc-sidebar .toc-sub { display: none; }
  .doc-sidebar .toc-h2.active + .toc-sub, .doc-sidebar .toc-sub:has(.active) { display: flex; }
  .doc-sidebar .nav-link.active { color: var(--bs-primary); border-left-color: var(--bs-primary); background: var(--bs-primary-bg-subtle); }
  .doc-sidebar .nav-link.hidden-by-filter { display: none !important; }
  main { max-width: 980px; }
  .doc-section { padding-bottom: 1.5rem; margin-bottom: 2rem; border-bottom: 1px solid var(--bs-border-color); }
  .doc-section:last-child { border-bottom: 0; }
  h2 { margin-top: .5rem; margin-bottom: 1.25rem; padding-bottom: .4rem; font-weight: 700; }
  h3 { margin-top: 2rem; margin-bottom: .9rem; font-weight: 600; }
  h4 { margin-top: 1.5rem; font-size: 1.1rem; font-weight: 600; }
  .anchor-link { margin-left: .5rem; text-decoration: none; opacity: 0; color: var(--bs-secondary-color); }
  h2:hover .anchor-link, h3:hover .anchor-link { opacity: 1; }
  p code, li code, td code, th code { color: var(--bs-code-color); background: var(--bs-tertiary-bg); padding: .1rem .3rem; border-radius: .25rem; font-size: .85em; }
  .code-block pre { margin: 0; border-radius: .5rem; border: 1px solid var(--bs-border-color); }
  .code-block pre code.hljs { padding: 1rem; border-radius: .5rem; font-size: .84rem; line-height: 1.5; }
  .code-block pre code:not(.hljs) { display: block; padding: 1rem; background: var(--bs-tertiary-bg); font-size: .84rem; }
  .copy-btn { position: absolute; top: .5rem; right: .5rem; z-index: 2; opacity: 0; transition: opacity .15s; background: var(--bs-body-bg); }
  .code-block:hover .copy-btn, .copy-btn:focus { opacity: 1; }
  .table { font-size: .9rem; }
  .table td, .table th { vertical-align: top; }
  .diagram { overflow-x: auto; background: var(--bs-body-bg); }
  .diagram pre.mermaid { margin: 0; background: transparent; text-align: center; }
  .doc-hero { background: linear-gradient(135deg, var(--bs-primary-bg-subtle), var(--bs-body-bg)); border: 1px solid var(--bs-border-color); }
  .doc-hero .lead { font-size: 1.05rem; }
  ul.contains-task-list, li.task-list-item { list-style: none; padding-left: 0; }
  #backToTop { position: fixed; right: 1rem; bottom: 1rem; display: none; z-index: 1030; }
  @media (max-width: 991.98px) { .doc-sidebar { position: static; height: auto; } }
  @media (max-width: 575.98px) { .doc-hero { padding: 1.25rem !important; } .doc-hero h1 { font-size: 1.6rem; } .table { font-size: .82rem; } }
  @media print {
    .navbar, .offcanvas-lg, #backToTop, .copy-btn, .anchor-link { display: none !important; }
    main { max-width: none; }
    .doc-section { break-inside: auto; }
  }
</style>
</head>
<body data-bs-spy="scroll" data-bs-target="#toc" data-bs-root-margin="0px 0px -70%" tabindex="0">

<nav class="navbar navbar-expand bg-body-tertiary border-bottom sticky-top">
  <div class="container-fluid">
    <button class="btn btn-outline-secondary btn-sm d-lg-none me-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar" aria-label="Open contents">
      <i class="bi bi-list"></i>
    </button>
    <a class="navbar-brand fw-semibold text-truncate" href="#top"><i class="bi bi-phone me-1 text-primary"></i>${esc(title)}</a>
    <div class="ms-auto d-flex align-items-center gap-2">
      <span class="badge text-bg-secondary d-none d-sm-inline">OpenCart 4.1.0.4</span>
      <span class="badge text-bg-primary d-none d-sm-inline">Expo SDK 58</span>
      <button id="themeToggle" class="btn btn-outline-secondary btn-sm" type="button" aria-label="Toggle dark mode"><i class="bi bi-moon-stars"></i></button>
    </div>
  </div>
</nav>

<div class="container-fluid" id="top">
  <div class="row">
    <aside class="col-lg-3 col-xl-3 border-end">
      <div class="offcanvas-lg offcanvas-start" tabindex="-1" id="sidebar" aria-labelledby="sidebarLabel">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="sidebarLabel">Contents</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebar" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body d-block p-0">
          <div class="doc-sidebar py-3 pe-2 w-100">
            <div class="px-2 mb-3">
              <input id="tocFilter" type="search" class="form-control form-control-sm" placeholder="Filter sections…" aria-label="Filter sections">
            </div>
            <nav id="toc" class="nav flex-column">
              ${tocHtml}
            </nav>
          </div>
        </div>
      </div>
    </aside>

    <main class="col-lg-9 col-xl-9 px-3 px-md-4 py-4">
      <div class="doc-hero rounded-3 p-4 mb-4">
        <h1 class="display-6 fw-bold mb-3">${esc(title)}</h1>
        <div class="lead">${intro}</div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <span class="badge rounded-pill text-bg-light border">TypeScript</span>
          <span class="badge rounded-pill text-bg-light border">React Native 0.88</span>
          <span class="badge rounded-pill text-bg-light border">React Query 5</span>
          <span class="badge rounded-pill text-bg-light border">React Navigation 7</span>
          <span class="badge rounded-pill text-bg-light border">PHP 8.3</span>
          <span class="badge rounded-pill text-bg-light border">OpenCart extension</span>
        </div>
      </div>

      ${body}

      <footer class="text-body-secondary small py-4">
        Generated from <code>docs/DEVELOPER.md</code> on ${built}. Edit the Markdown file, then rebuild with <code>docs/build-html.cjs</code>.
      </footer>
    </main>
  </div>
</div>

<a id="backToTop" href="#top" class="btn btn-primary rounded-circle shadow" aria-label="Back to top"><i class="bi bi-arrow-up"></i></a>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/languages/typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/languages/php.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>
(function () {
  var root = document.documentElement;

  function storedTheme() {
    try { return localStorage.getItem('oc-docs-theme'); } catch (e) { return null; }
  }
  function saveTheme(t) {
    try { localStorage.setItem('oc-docs-theme', t); } catch (e) {}
  }

  function renderDiagrams(theme) {
    if (!window.mermaid) return;
    document.querySelectorAll('pre.mermaid').forEach(function (el) {
      el.removeAttribute('data-processed');
      el.textContent = el.getAttribute('data-src');
    });
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
    mermaid.run({ querySelector: 'pre.mermaid' }).catch(function () {});
  }

  function applyTheme(theme) {
    root.setAttribute('data-bs-theme', theme);
    document.getElementById('hljs-light').disabled = theme === 'dark';
    document.getElementById('hljs-dark').disabled = theme !== 'dark';
    document.getElementById('themeToggle').innerHTML = theme === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
    document.querySelectorAll('.doc-hero .badge, thead.table-light').forEach(function (el) {
      if (el.tagName === 'THEAD') { el.classList.toggle('table-light', theme !== 'dark'); el.classList.toggle('table-dark', theme === 'dark'); }
      else { el.classList.toggle('text-bg-light', theme !== 'dark'); el.classList.toggle('text-bg-dark', theme === 'dark'); }
    });
    renderDiagrams(theme);
  }

  var initial = storedTheme() || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initial);

  document.getElementById('themeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  });

  // Syntax highlighting
  if (window.hljs) {
    document.querySelectorAll('pre code:not(.language-plaintext)').forEach(function (el) { hljs.highlightElement(el); });
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.parentElement.querySelector('code').innerText;
      navigator.clipboard.writeText(code).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });

  // Sidebar filter
  var filter = document.getElementById('tocFilter');
  filter.addEventListener('input', function () {
    var q = filter.value.trim().toLowerCase();
    document.querySelectorAll('#toc .nav-link').forEach(function (a) {
      a.classList.toggle('hidden-by-filter', q !== '' && a.textContent.toLowerCase().indexOf(q) === -1);
    });
    document.querySelectorAll('#toc .toc-sub').forEach(function (sub) {
      sub.style.display = q ? 'flex' : '';
    });
  });

  // Close the mobile sidebar after choosing a section
  var sidebar = document.getElementById('sidebar');
  document.querySelectorAll('#toc .nav-link').forEach(function (a) {
    a.addEventListener('click', function () {
      var oc = bootstrap.Offcanvas.getInstance(sidebar);
      if (oc) oc.hide();
    });
  });

  // Back to top
  var toTop = document.getElementById('backToTop');
  window.addEventListener('scroll', function () {
    toTop.style.display = window.scrollY > 800 ? 'inline-flex' : 'none';
  }, { passive: true });

  // External links open in a new tab
  document.querySelectorAll('main a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(out, page);
console.log(`Built ${out} (${toc.filter((t) => t.depth === 2).length} sections, ${toc.length} headings)`);
