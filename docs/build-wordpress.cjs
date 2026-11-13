#!/usr/bin/env node
/**
 * Builds docs/developer-guide.wordpress.xml from docs/DEVELOPER.md.
 *
 * The output is a WordPress eXtended RSS (WXR 1.2) file with a 5-part series of
 * draft POSTS. Content is native block-editor (Gutenberg) markup: headings with
 * anchors, paragraphs, lists, tables and code blocks. Mermaid diagrams are
 * rendered to inline SVG with headless Chrome and placed in Custom HTML blocks.
 *
 *   Part 1  sections 1–4    Part 4  sections 10–12
 *   Part 2  sections 5–7    Part 5  sections 13–19
 *   Part 3  sections 8–9
 *
 * Links between sections in the same post stay #anchors. Links to a section in
 * another part point to that post as {WP_SITE_URL}/?name=<post-slug>#<anchor>,
 * which works with every permalink setting (WordPress redirects to the pretty URL).
 *
 * Import: WordPress admin → Tools → Import → WordPress → upload the .xml file.
 *
 * Build:
 *   cd docs && npm ci && npm run build:wordpress
 *
 * Options (environment variables):
 *   WP_SITE_URL=https://example.com/blog   site address, for links between parts
 *                                          (default: "" = root-relative "/?name=…",
 *                                          right for WordPress installed at the domain root)
 *   WP_MEDIA_URL=https://cdn.example.com/oc-guide
 *                                          public folder URL where docs/featured-images/part-1.png …
 *                                          part-5.png are uploaded. When set, the import includes
 *                                          them as attachments and sets each post's featured image
 *                                          (tick "Download and import file attachments" when importing).
 *                                          When not set, no images are referenced; set them by hand
 *                                          or with WP-CLI (see docs/featured-images/README.md).
 *   CHROME=/path/to/chrome                 headless Chrome used to render diagrams
 *
 * SEO: each post carries an SEO title (≤ 60 chars) and meta description (≤ 160 chars),
 * set in PARTS below, stored for Yoast SEO, Rank Math, SEOPress and The SEO Framework.
 * The description is also the post excerpt.
 *                                          (default: Google Chrome on macOS; if missing,
 *                                          diagrams stay as code blocks with Mermaid source)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { marked } = require('marked');

const src = path.join(__dirname, 'DEVELOPER.md');
const out = path.join(__dirname, 'developer-guide.wordpress.xml');
const md = fs.readFileSync(src, 'utf8');

const SERIES = 'OpenCart Mobile App Developer Guide';
const SITE = (process.env.WP_SITE_URL || '').replace(/\/+$/, '');
const MEDIA = (process.env.WP_MEDIA_URL || '').replace(/\/+$/, '');

const PARTS = [
  {
    sections: [1, 2, 3, 4],
    title: 'Overview, Architecture, Repository Layout and Languages',
    seoTitle: 'OpenCart Mobile App Guide 1: Architecture & Overview',
    seoDescription:
      'How the OpenCart 4.1.0.4 mobile app works: why it uses a custom API extension, its architecture, the repository layout and the languages used.',
  },
  {
    sections: [5, 6, 7],
    title: 'Tools and Libraries, Why Expo, and the Development Environment',
    seoTitle: 'OpenCart Mobile App Guide 2: Tools, Expo & Dev Setup',
    seoDescription:
      'The tools and libraries behind the OpenCart mobile app, why Expo and React Native were chosen, and how to set up the local development environment.',
  },
  {
    sections: [8, 9],
    title: 'The OpenCart Extension and the Mobile App',
    seoTitle: 'OpenCart Mobile App Guide 3: API Extension & App Code',
    seoDescription:
      'Inside the OpenCart mobile_api extension and the React Native app: request flow, sessions, the API client, caching, navigation, theming and screens.',
  },
  {
    sections: [10, 11, 12],
    title: 'Design Patterns, Hooks and End-to-End Flows',
    seoTitle: 'OpenCart Mobile App Guide 4: Patterns, Hooks & Flows',
    seoDescription:
      'Design patterns and React hooks used in the OpenCart mobile app, with end-to-end flows for login, cart, wishlist, checkout, online payment and orders.',
  },
  {
    sections: [13, 14, 15, 16, 17, 18, 19],
    title: 'Configuration, Security, Extending, Testing, Releasing and Troubleshooting',
    seoTitle: 'OpenCart Mobile App Guide 5: Config, Security & More',
    seoDescription:
      'Configure, secure, extend, test, release and troubleshoot the OpenCart mobile app: settings reference, security checklist and step-by-step recipes.',
  },
].map((p, i) => {
  // Search engines truncate longer values.
  if (p.seoTitle.length > 60) throw new Error(`Part ${i + 1} SEO title is ${p.seoTitle.length} characters (max 60)`);
  if (p.seoDescription.length > 160) throw new Error(`Part ${i + 1} meta description is ${p.seoDescription.length} characters (max 160)`);
  return p;
}).map((p, i) => ({
  ...p,
  number: i + 1,
  fullTitle: `${SERIES}, Part ${i + 1}: ${p.title}`,
  slug: `opencart-mobile-app-developer-guide-part-${i + 1}`,
  anchors: new Set(),
  headings: [],
  tokens: [],
}));

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/ /g, '-');
const postUrl = (part, anchor = '') => `${SITE}/?name=${part.slug}${anchor ? '#' + anchor : ''}`;

let currentPart = null; // set while rendering a part, used by the link renderer

marked.use({
  gfm: true,
  renderer: {
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (href.startsWith('#')) {
        const anchor = href.slice(1);
        if (currentPart && currentPart.anchors.has(anchor)) return `<a href="${esc(href)}">${text}</a>`;
        const target = PARTS.find((p) => p.anchors.has(anchor));
        return target ? `<a href="${esc(postUrl(target, anchor))}">${text}</a>` : text;
      }
      if (/^(https?:|mailto:)/.test(href)) return `<a href="${esc(href)}">${text}</a>`;
      // Repository files mean nothing on a WordPress site: keep the text, show the path as code.
      const file = href.replace(/^(\.\.\/)+/, '');
      return text.replace(/<[^>]+>/g, '') === file ? `<code>${esc(file)}</code>` : `${text} (<code>${esc(file)}</code>)`;
    },
  },
});

const inline = (text) => marked.parseInline(text);

// The code block's save() escapes "[" (so shortcodes don't run) and "://" (so URLs aren't auto-embedded).
const codeEscape = (s) => esc(s).replace(/\[/g, '&#91;').replace(/:\/\//g, ':&#47;&#47;');

// ---------------------------------------------------------------- split into parts

const tokens = marked.lexer(md);
const intro = [];
let mode = 'intro'; // intro → contents (skipped) → sections
let part = null;

for (const t of tokens) {
  if (t.type === 'heading' && t.depth === 1) continue;
  if (t.type === 'hr') continue; // section separators; parts add their own
  if (t.type === 'heading' && t.depth === 2) {
    const n = parseInt(t.text, 10);
    if (!n) {
      mode = 'contents';
      continue;
    }
    mode = 'sections';
    part = PARTS.find((p) => p.sections.includes(n));
    if (!part) throw new Error(`Section ${n} is not assigned to a part`);
    if (part.tokens.length) part.tokens.push({ type: 'hr' });
  }
  if (mode === 'intro') intro.push(t);
  else if (mode === 'sections') part.tokens.push(t);
}

for (const p of PARTS) {
  for (const t of p.tokens) {
    if (t.type === 'heading' && t.depth >= 2) {
      const text = t.text.replace(/`/g, '');
      p.anchors.add(slug(text));
      if (t.depth === 2) p.headings.push({ id: slug(text), text });
    }
  }
}

// ---------------------------------------------------------------- diagrams

function renderDiagrams(sources) {
  if (!sources.length) return [];
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chrome)) {
    console.warn(`Chrome not found at ${chrome}; diagrams will be kept as Mermaid source.`);
    return sources.map(() => null);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-wp-'));
  const page = path.join(dir, 'render.html');
  fs.writeFileSync(
    page,
    `<!doctype html><html><body>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>
const sources = ${JSON.stringify(sources)};
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict', htmlLabels: false, flowchart: { htmlLabels: false } });
(async () => {
  for (let i = 0; i < sources.length; i++) {
    const div = document.createElement('div');
    div.className = 'out';
    try {
      const { svg } = await mermaid.render('oc-diagram-' + (i + 1), sources[i]);
      div.setAttribute('data-svg', btoa(unescape(encodeURIComponent(svg))));
    } catch (e) {
      div.setAttribute('data-error', String(e));
    }
    document.body.appendChild(div);
  }
})();
</script></body></html>`,
  );
  try {
    const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', 'file://' + page], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    const svgs = [...dom.matchAll(/<div class="out"( data-svg="([^"]*)")?( data-error="([^"]*)")?/g)].map((m) => {
      if (m[2]) return Buffer.from(m[2], 'base64').toString('utf8');
      console.warn('Diagram failed:', (m[4] || 'unknown error').slice(0, 300));
      return null;
    });
    return sources.map((_, i) => svgs[i] || null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const allTokens = PARTS.flatMap((p) => p.tokens);
const diagramSources = allTokens.filter((t) => t.type === 'code' && t.lang === 'mermaid').map((t) => t.text);
const diagrams = renderDiagrams(diagramSources);
let diagramIndex = 0;

// ---------------------------------------------------------------- blocks

const paragraph = (html) => `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;

function listBlock(list) {
  const tag = list.ordered ? 'ol' : 'ul';
  const attrs = list.ordered ? ' {"ordered":true}' : '';
  const items = list.items
    .map((item) => {
      let body = '';
      for (const child of item.tokens) {
        if (child.type === 'list') body += listBlock(child);
        else if (child.type === 'text' || child.type === 'paragraph') body += inline(child.text);
        else if (child.type === 'code') body += `<code>${esc(child.text)}</code>`;
      }
      if (item.task) body = (item.checked ? '☑ ' : '☐ ') + body;
      return `<!-- wp:list-item -->\n<li>${body}</li>\n<!-- /wp:list-item -->`;
    })
    .join('\n');
  return `<!-- wp:list${attrs} -->\n<${tag} class="wp-block-list">${items}</${tag}>\n<!-- /wp:list -->`;
}

function block(t) {
  switch (t.type) {
    case 'space':
      return '';
    case 'heading': {
      const id = slug(t.text.replace(/`/g, ''));
      const attrs = t.depth === 2 ? '' : ` {"level":${t.depth}}`;
      return `<!-- wp:heading${attrs} -->\n<h${t.depth} class="wp-block-heading" id="${id}">${inline(t.text)}</h${t.depth}>\n<!-- /wp:heading -->`;
    }
    case 'paragraph':
      return paragraph(inline(t.text));
    case 'list':
      return listBlock(t);
    case 'table': {
      const head = `<thead><tr>${t.header.map((c) => `<th>${inline(c.text)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c.text)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<!-- wp:table {"hasFixedLayout":false,"align":"wide"} -->\n<figure class="wp-block-table alignwide"><table>${head}${body}</table></figure>\n<!-- /wp:table -->`;
    }
    case 'code': {
      if (t.lang === 'mermaid') {
        const svg = diagrams[diagramIndex++];
        if (svg) {
          return `<!-- wp:html -->\n<figure class="oc-diagram alignwide" style="overflow-x:auto;margin:1.5em 0;padding:1em;border:1px solid #e4e7ec;border-radius:8px;background:#fff;text-align:center">${svg}</figure>\n<!-- /wp:html -->`;
        }
      }
      // Themes usually wrap code lines; wide trees and tables of text must not wrap, so
      // long-lined blocks become a non-wrapping, horizontally scrollable Custom HTML block.
      if (t.text.split('\n').some((l) => l.length > 72)) {
        return `<!-- wp:html -->\n<pre class="wp-block-code alignwide" style="white-space:pre;overflow-x:auto;font-size:.8em;line-height:1.45"><code>${codeEscape(t.text)}</code></pre>\n<!-- /wp:html -->`;
      }
      return `<!-- wp:code {"align":"wide"} -->\n<pre class="wp-block-code alignwide"><code>${codeEscape(t.text)}</code></pre>\n<!-- /wp:code -->`;
    }
    case 'blockquote':
      return `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${t.tokens
        .filter((c) => c.type === 'paragraph')
        .map((c) => paragraph(inline(c.text)))
        .join('\n')}</blockquote>\n<!-- /wp:quote -->`;
    case 'hr':
      return `<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->`;
    case 'html':
      return `<!-- wp:html -->\n${t.text}\n<!-- /wp:html -->`;
    default:
      console.warn('Unhandled token type:', t.type);
      return '';
  }
}

function seriesList(current) {
  const items = PARTS.map((p) => {
    const label = `Part ${p.number}: ${esc(p.title)}`;
    const body = p === current ? `<strong>${label}</strong> (you are reading this part)` : `<a href="${esc(postUrl(p))}">${label}</a>`;
    return `<!-- wp:list-item -->\n<li>${body}</li>\n<!-- /wp:list-item -->`;
  }).join('\n');
  return `<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">${items}</ol>\n<!-- /wp:list -->`;
}

function inThisPost(p) {
  const items = p.headings.map((h) => `<!-- wp:list-item -->\n<li><a href="#${h.id}">${esc(h.text)}</a></li>\n<!-- /wp:list-item -->`).join('\n');
  return `<!-- wp:list -->\n<ul class="wp-block-list">${items}</ul>\n<!-- /wp:list -->`;
}

function renderPart(p) {
  currentPart = p;
  const out = [];

  if (p.number === 1) {
    out.push(...intro.map(block).filter(Boolean));
    out.push(paragraph(`This guide is published as a ${PARTS.length}-part series. This is part 1.`));
  } else {
    out.push(
      paragraph(
        `This is <strong>part ${p.number} of ${PARTS.length}</strong> of the ${SERIES}. New to the project? Start with <a href="${esc(postUrl(PARTS[0]))}">Part 1: ${esc(PARTS[0].title)}</a>.`,
      ),
    );
  }

  out.push(`<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading" id="in-this-post">In this post</h3>\n<!-- /wp:heading -->`);
  out.push(inThisPost(p));
  out.push(block({ type: 'hr' }));

  out.push(...p.tokens.map(block).filter(Boolean));

  out.push(block({ type: 'hr' }));
  const prev = PARTS[p.number - 2];
  const next = PARTS[p.number];
  const nav = [
    prev ? `← Previous: <a href="${esc(postUrl(prev))}">Part ${prev.number}: ${esc(prev.title)}</a>` : '',
    next ? `Next: <a href="${esc(postUrl(next))}">Part ${next.number}: ${esc(next.title)}</a> →` : '',
  ].filter(Boolean);
  if (nav.length) out.push(paragraph(nav.join('<br>')));
  out.push(`<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading" id="the-series">The series</h3>\n<!-- /wp:heading -->`);
  out.push(seriesList(p));

  currentPart = null;
  return out.join('\n\n');
}

// ---------------------------------------------------------------- WXR

const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const pad = (n) => String(n).padStart(2, '0');
const wpDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const wpDateGmt = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

const category = { slug: 'opencart-mobile-app', name: 'OpenCart Mobile App' };
const tags = [
  ['opencart', 'OpenCart'],
  ['react-native', 'React Native'],
  ['expo', 'Expo'],
  ['typescript', 'TypeScript'],
  ['php', 'PHP'],
  ['developer-guide', 'Developer Guide'],
];

// Part 1 gets the earliest date, so the series reads in order by date. One minute apart,
// starting an hour in the past: future dates would make WordPress schedule the posts
// instead of publishing them when you press Publish right after importing.
const base = new Date(Date.now() - 60 * 60 * 1000);
base.setSeconds(0, 0);

// SEO title and meta description, stored under the keys of the common SEO plugins.
// Each plugin reads only its own keys; the others are ignored.
const SEO_KEYS = [
  ['_yoast_wpseo_title', '_yoast_wpseo_metadesc'], // Yoast SEO
  ['rank_math_title', 'rank_math_description'], // Rank Math
  ['_seopress_titles_title', '_seopress_titles_desc'], // SEOPress
  ['_genesis_title', '_genesis_description'], // The SEO Framework
];

function seoMeta(p) {
  const meta = (key, value) => `    <wp:postmeta>
      <wp:meta_key>${cdata(key)}</wp:meta_key>
      <wp:meta_value>${cdata(value)}</wp:meta_value>
    </wp:postmeta>`;
  return SEO_KEYS.map(([t, d]) => `${meta(t, p.seoTitle)}\n${meta(d, p.seoDescription)}`).join('\n');
}

// Featured image attachment (only when WP_MEDIA_URL is set). Listed after its post.
function attachmentItem(p, date) {
  const url = `${MEDIA}/part-${p.number}.png`;
  const alt = `${SERIES}, Part ${p.number}: ${p.title}`;
  return `
  <item>
    <title>${cdata(`${SERIES} Part ${p.number} featured image`)}</title>
    <link>${esc(url)}</link>
    <pubDate>${date.toUTCString()}</pubDate>
    <dc:creator>${cdata('admin')}</dc:creator>
    <guid isPermaLink="false">${esc(url)}</guid>
    <description></description>
    <content:encoded>${cdata('')}</content:encoded>
    <excerpt:encoded>${cdata(alt)}</excerpt:encoded>
    <wp:post_id>${900200 + p.number}</wp:post_id>
    <wp:post_date>${cdata(wpDate(date))}</wp:post_date>
    <wp:post_date_gmt>${cdata(wpDateGmt(date))}</wp:post_date_gmt>
    <wp:post_modified>${cdata(wpDate(date))}</wp:post_modified>
    <wp:post_modified_gmt>${cdata(wpDateGmt(date))}</wp:post_modified_gmt>
    <wp:comment_status>${cdata('closed')}</wp:comment_status>
    <wp:ping_status>${cdata('closed')}</wp:ping_status>
    <wp:post_name>${cdata(`${p.slug}-featured`)}</wp:post_name>
    <wp:status>${cdata('inherit')}</wp:status>
    <wp:post_parent>${900100 + p.number}</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:post_type>${cdata('attachment')}</wp:post_type>
    <wp:post_password>${cdata('')}</wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
    <wp:attachment_url>${cdata(url)}</wp:attachment_url>
    <wp:postmeta>
      <wp:meta_key>${cdata('_wp_attachment_image_alt')}</wp:meta_key>
      <wp:meta_value>${cdata(alt)}</wp:meta_value>
    </wp:postmeta>
  </item>`;
}

const items = PARTS.map((p, i) => {
  const date = new Date(base.getTime() + i * 60 * 1000);
  const excerpt = p.seoDescription;
  const content = renderPart(p);
  return `
  <item>
    <title>${cdata(p.fullTitle)}</title>
    <link>${esc(SITE || 'https://example.com')}/?name=${p.slug}</link>
    <pubDate>${date.toUTCString()}</pubDate>
    <dc:creator>${cdata('admin')}</dc:creator>
    <guid isPermaLink="false">${esc(SITE || 'https://example.com')}/?name=${p.slug}</guid>
    <description></description>
    <content:encoded>${cdata(content)}</content:encoded>
    <excerpt:encoded>${cdata(excerpt)}</excerpt:encoded>
    <wp:post_id>${900100 + p.number}</wp:post_id>
    <wp:post_date>${cdata(wpDate(date))}</wp:post_date>
    <wp:post_date_gmt>${cdata(wpDateGmt(date))}</wp:post_date_gmt>
    <wp:post_modified>${cdata(wpDate(date))}</wp:post_modified>
    <wp:post_modified_gmt>${cdata(wpDateGmt(date))}</wp:post_modified_gmt>
    <wp:comment_status>${cdata('open')}</wp:comment_status>
    <wp:ping_status>${cdata('open')}</wp:ping_status>
    <wp:post_name>${cdata(p.slug)}</wp:post_name>
    <wp:status>${cdata('draft')}</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:post_type>${cdata('post')}</wp:post_type>
    <wp:post_password>${cdata('')}</wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
    <category domain="category" nicename="${category.slug}">${cdata(category.name)}</category>
${seoMeta(p)}${
      MEDIA
        ? `
    <wp:postmeta>
      <wp:meta_key>${cdata('_thumbnail_id')}</wp:meta_key>
      <wp:meta_value>${cdata(String(900200 + p.number))}</wp:meta_value>
    </wp:postmeta>`
        : ''
    }
${tags.map(([s, n]) => `    <category domain="post_tag" nicename="${s}">${cdata(n)}</category>`).join('\n')}
  </item>${MEDIA ? attachmentItem(p, date) : ''}`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<!-- Generated from docs/DEVELOPER.md by docs/build-wordpress.cjs on ${base.toISOString().slice(0, 10)}.
     Import with WordPress admin → Tools → Import → WordPress. Creates ${PARTS.length} draft posts. -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>${cdata(SERIES)}</title>
  <link>${esc(SITE || 'https://example.com')}</link>
  <description>${cdata(`A ${PARTS.length}-part developer guide for the OpenCart 4.1.0.4 mobile app and its Mobile App API extension.`)}</description>
  <pubDate>${base.toUTCString()}</pubDate>
  <language>en-US</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${esc(SITE || 'https://example.com')}</wp:base_site_url>
  <wp:base_blog_url>${esc(SITE || 'https://example.com')}</wp:base_blog_url>

  <wp:author>
    <wp:author_id>1</wp:author_id>
    <wp:author_login>${cdata('admin')}</wp:author_login>
    <wp:author_email>${cdata('')}</wp:author_email>
    <wp:author_display_name>${cdata('admin')}</wp:author_display_name>
    <wp:author_first_name>${cdata('')}</wp:author_first_name>
    <wp:author_last_name>${cdata('')}</wp:author_last_name>
  </wp:author>

  <wp:category>
    <wp:term_id>9001</wp:term_id>
    <wp:category_nicename>${cdata(category.slug)}</wp:category_nicename>
    <wp:category_parent>${cdata('')}</wp:category_parent>
    <wp:cat_name>${cdata(category.name)}</wp:cat_name>
  </wp:category>
${tags.map(([s, n], i) => `  <wp:tag><wp:term_id>${9101 + i}</wp:term_id><wp:tag_slug>${cdata(s)}</wp:tag_slug><wp:tag_name>${cdata(n)}</wp:tag_name></wp:tag>`).join('\n')}
${items}
</channel>
</rss>
`;

fs.writeFileSync(out, xml);
const rendered = diagrams.filter(Boolean).length;
console.log(`Built ${out} (${(xml.length / 1024).toFixed(0)} KB, ${PARTS.length} posts, ${rendered}/${diagramSources.length} diagrams as SVG)`);
console.log(MEDIA ? `  Featured images: ${MEDIA}/part-1.png … part-${PARTS.length}.png` : '  Featured images: not included (set WP_MEDIA_URL to attach docs/featured-images/*.png)');
for (const p of PARTS) {
  console.log(`  Part ${p.number}: sections ${p.sections.join(', ')} → ${p.slug}`);
  console.log(`    SEO title (${p.seoTitle.length}): ${p.seoTitle}`);
  console.log(`    Meta description (${p.seoDescription.length}): ${p.seoDescription}`);
}
