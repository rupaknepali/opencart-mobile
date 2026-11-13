#!/usr/bin/env node
/**
 * Builds docs/readme-post.wordpress.xml: README.md as one WordPress draft POST, in
 * block-editor (Gutenberg) markup, ready for Tools → Import → WordPress.
 *
 * - Links to files and folders in the repository become absolute GitHub links
 *   (blob/<branch>/… and tree/<branch>/…), so they work on a website.
 * - Links inside the README (#features, …) stay in-page anchors.
 * - Adds "View on GitHub" / "Download ZIP" buttons and, at the end, links to the
 *   5-part developer guide series from developer-guide.wordpress.xml.
 * - Carries an SEO title and meta description for Yoast SEO, Rank Math, SEOPress and
 *   The SEO Framework (the description is also the excerpt).
 *
 * Build:
 *   cd docs && npm ci && npm run build:readme-post
 *
 * Options (environment variables):
 *   REPO_URL=https://github.com/owner/repo   default: the git remote "origin"
 *   REPO_BRANCH=main                         default: main
 *   WP_SITE_URL=https://example.com/blog     site address, for links to the guide series
 *                                            (default "" = root-relative "/?name=…")
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { marked } = require('marked');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'readme-post.wordpress.xml');
const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

function originUrl() {
  try {
    return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const REPO = (process.env.REPO_URL || originUrl())
  .replace(/^git@github\.com:/, 'https://github.com/')
  .replace(/\.git$/, '')
  .replace(/\/+$/, '');
const BRANCH = process.env.REPO_BRANCH || 'main';
const SITE = (process.env.WP_SITE_URL || '').replace(/\/+$/, '');

if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(REPO)) {
  console.error(`Could not work out the GitHub repository URL (got "${REPO}"). Set REPO_URL=https://github.com/owner/repo.`);
  process.exit(1);
}

const POST = {
  title: 'OpenCart Mobile App: a Native iOS and Android App for OpenCart 4.1.0.4',
  slug: 'opencart-mobile-app',
  seoTitle: 'OpenCart Mobile App for iOS & Android (OpenCart 4.1.0.4)',
  seoDescription:
    'A native iOS and Android shopping app for OpenCart 4.1.0.4 stores, built with Expo and React Native, with its own Mobile App API extension. Code on GitHub.',
};
if (POST.seoTitle.length > 60) throw new Error(`SEO title is ${POST.seoTitle.length} characters (max 60)`);
if (POST.seoDescription.length > 160) throw new Error(`Meta description is ${POST.seoDescription.length} characters (max 160)`);

// The 5-part developer guide series (see build-wordpress.cjs)
const SERIES = [
  'Overview, Architecture, Repository Layout and Languages',
  'Tools and Libraries, Why Expo, and the Development Environment',
  'The OpenCart Extension and the Mobile App',
  'Design Patterns, Hooks and End-to-End Flows',
  'Configuration, Security, Extending, Testing, Releasing and Troubleshooting',
].map((title, i) => ({ title, url: `${SITE}/?name=opencart-mobile-app-developer-guide-part-${i + 1}` }));

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/ /g, '-');
// The code block's save() escapes "[" (no shortcodes) and "://" (no auto-embeds).
const codeEscape = (s) => esc(s).replace(/\[/g, '&#91;').replace(/:\/\//g, ':&#47;&#47;');

/** Repository-relative path → GitHub URL (blob for files, tree for folders). */
function githubUrl(href) {
  const [p, anchor] = href.split('#');
  const clean = p.replace(/^\.\//, '').replace(/\/+$/, '');
  const isDir = p.endsWith('/') || (fs.existsSync(path.join(root, clean)) && fs.statSync(path.join(root, clean)).isDirectory());
  return `${REPO}/${isDir ? 'tree' : 'blob'}/${BRANCH}/${clean}${anchor ? '#' + anchor : ''}`;
}

const githubLinks = new Set();

marked.use({
  gfm: true,
  renderer: {
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      let url = href;
      if (!/^(https?:|mailto:|#)/.test(href)) {
        url = githubUrl(href);
        githubLinks.add(url);
      }
      return `<a href="${esc(url)}">${text}</a>`;
    },
  },
});

const inline = (text) => marked.parseInline(text);
const paragraph = (html) => `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;
const heading = (level, id, html) =>
  `<!-- wp:heading${level === 2 ? '' : ` {"level":${level}}`} -->\n<h${level} class="wp-block-heading" id="${id}">${html}</h${level}>\n<!-- /wp:heading -->`;

function listBlock(list) {
  const tag = list.ordered ? 'ol' : 'ul';
  const items = list.items
    .map((item) => {
      let body = '';
      for (const child of item.tokens) {
        if (child.type === 'list') body += listBlock(child);
        else if (child.type === 'text' || child.type === 'paragraph') body += inline(child.text);
        else if (child.type === 'code') body += `<code>${esc(child.text)}</code>`;
      }
      return `<!-- wp:list-item -->\n<li>${body}</li>\n<!-- /wp:list-item -->`;
    })
    .join('\n');
  return `<!-- wp:list${list.ordered ? ' {"ordered":true}' : ''} -->\n<${tag} class="wp-block-list">${items}</${tag}>\n<!-- /wp:list -->`;
}

function block(t) {
  switch (t.type) {
    case 'space':
    case 'hr':
      return '';
    case 'heading':
      return t.depth === 1 ? '' : heading(t.depth, slug(t.text.replace(/`/g, '')), inline(t.text));
    case 'paragraph':
      return paragraph(inline(t.text));
    case 'list':
      return listBlock(t);
    case 'table': {
      const head = `<thead><tr>${t.header.map((c) => `<th>${inline(c.text)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c.text)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<!-- wp:table {"hasFixedLayout":false,"align":"wide"} -->\n<figure class="wp-block-table alignwide"><table>${head}${body}</table></figure>\n<!-- /wp:table -->`;
    }
    case 'code':
      // Long lines (the diagram, the folder tree) must not wrap: non-wrapping, scrollable HTML block.
      if (t.text.split('\n').some((l) => l.length > 72)) {
        return `<!-- wp:html -->\n<pre class="wp-block-code alignwide" style="white-space:pre;overflow-x:auto;font-size:.8em;line-height:1.45"><code>${codeEscape(t.text)}</code></pre>\n<!-- /wp:html -->`;
      }
      return `<!-- wp:code {"align":"wide"} -->\n<pre class="wp-block-code alignwide"><code>${codeEscape(t.text)}</code></pre>\n<!-- /wp:code -->`;
    case 'html':
      return `<!-- wp:html -->\n${t.text}\n<!-- /wp:html -->`;
    default:
      console.warn('Unhandled token type:', t.type);
      return '';
  }
}

function buttons() {
  const button = (label, href, outline = false) =>
    `<!-- wp:button${outline ? ' {"className":"is-style-outline"}' : ''} -->\n<div class="wp-block-button${outline ? ' is-style-outline' : ''}"><a class="wp-block-button__link wp-element-button" href="${esc(href)}">${label}</a></div>\n<!-- /wp:button -->`;
  return `<!-- wp:buttons -->\n<div class="wp-block-buttons">${button('View on GitHub', REPO)}\n\n${button('Download ZIP', `${REPO}/archive/refs/heads/${BRANCH}.zip`, true)}</div>\n<!-- /wp:buttons -->`;
}

// ---------------------------------------------------------------- content

const tokens = marked.lexer(md);
const firstH2 = tokens.findIndex((t) => t.type === 'heading' && t.depth === 2);
const intro = tokens.slice(0, firstH2);
const rest = tokens.slice(firstH2);

const parts = [];
// "this repository" makes sense on GitHub, not on a blog: link the repository instead.
parts.push(
  ...intro
    .map(block)
    .filter(Boolean)
    .map((html) => html.replace('included in this repository', `included in <a href="${esc(REPO)}">the GitHub repository</a>`)),
);
parts.push(buttons());
parts.push(...rest.map(block).filter(Boolean));

parts.push(`<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->`);
parts.push(heading(2, 'developer-guide-series', 'Developer guide series'));
parts.push(paragraph('The full developer guide is also published here as a five-part series:'));
parts.push(
  `<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">${SERIES.map(
    (p, i) => `<!-- wp:list-item -->\n<li><a href="${esc(p.url)}">Part ${i + 1}: ${esc(p.title)}</a></li>\n<!-- /wp:list-item -->`,
  ).join('\n')}</ol>\n<!-- /wp:list -->`,
);
parts.push(paragraph(`Source code, issues and releases: <a href="${esc(REPO)}">${esc(REPO.replace('https://', ''))}</a>.`));

const content = parts.join('\n\n');

// ---------------------------------------------------------------- WXR

const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const pad = (n) => String(n).padStart(2, '0');
const wpDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const wpDateGmt = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

// An hour in the past, so pressing Publish right after importing publishes instead of scheduling.
const date = new Date(Date.now() - 60 * 60 * 1000);
date.setSeconds(0, 0);

const category = { slug: 'opencart-mobile-app', name: 'OpenCart Mobile App' };
const tags = [
  ['opencart', 'OpenCart'],
  ['react-native', 'React Native'],
  ['expo', 'Expo'],
  ['ecommerce-app', 'Ecommerce App'],
  ['github', 'GitHub'],
];
const SEO_KEYS = [
  ['_yoast_wpseo_title', '_yoast_wpseo_metadesc'],
  ['rank_math_title', 'rank_math_description'],
  ['_seopress_titles_title', '_seopress_titles_desc'],
  ['_genesis_title', '_genesis_description'],
];
const meta = (key, value) => `    <wp:postmeta>
      <wp:meta_key>${cdata(key)}</wp:meta_key>
      <wp:meta_value>${cdata(value)}</wp:meta_value>
    </wp:postmeta>`;
const base = SITE || 'https://example.com';

const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<!-- Generated from README.md by docs/build-readme-post.cjs on ${date.toISOString().slice(0, 10)}.
     Import with WordPress admin → Tools → Import → WordPress. Creates one draft post. -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>${cdata(POST.title)}</title>
  <link>${esc(base)}</link>
  <description>${cdata(POST.seoDescription)}</description>
  <pubDate>${date.toUTCString()}</pubDate>
  <language>en-US</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${esc(base)}</wp:base_site_url>
  <wp:base_blog_url>${esc(base)}</wp:base_blog_url>

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
${tags.map(([s, n], i) => `  <wp:tag><wp:term_id>${9201 + i}</wp:term_id><wp:tag_slug>${cdata(s)}</wp:tag_slug><wp:tag_name>${cdata(n)}</wp:tag_name></wp:tag>`).join('\n')}

  <item>
    <title>${cdata(POST.title)}</title>
    <link>${esc(base)}/?name=${POST.slug}</link>
    <pubDate>${date.toUTCString()}</pubDate>
    <dc:creator>${cdata('admin')}</dc:creator>
    <guid isPermaLink="false">${esc(base)}/?name=${POST.slug}</guid>
    <description></description>
    <content:encoded>${cdata(content)}</content:encoded>
    <excerpt:encoded>${cdata(POST.seoDescription)}</excerpt:encoded>
    <wp:post_id>900300</wp:post_id>
    <wp:post_date>${cdata(wpDate(date))}</wp:post_date>
    <wp:post_date_gmt>${cdata(wpDateGmt(date))}</wp:post_date_gmt>
    <wp:post_modified>${cdata(wpDate(date))}</wp:post_modified>
    <wp:post_modified_gmt>${cdata(wpDateGmt(date))}</wp:post_modified_gmt>
    <wp:comment_status>${cdata('open')}</wp:comment_status>
    <wp:ping_status>${cdata('open')}</wp:ping_status>
    <wp:post_name>${cdata(POST.slug)}</wp:post_name>
    <wp:status>${cdata('draft')}</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:post_type>${cdata('post')}</wp:post_type>
    <wp:post_password>${cdata('')}</wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
    <category domain="category" nicename="${category.slug}">${cdata(category.name)}</category>
${tags.map(([s, n]) => `    <category domain="post_tag" nicename="${s}">${cdata(n)}</category>`).join('\n')}
${SEO_KEYS.map(([t, d]) => `${meta(t, POST.seoTitle)}\n${meta(d, POST.seoDescription)}`).join('\n')}
  </item>
</channel>
</rss>
`;

fs.writeFileSync(out, xml);
console.log(`Built ${out} (${(xml.length / 1024).toFixed(0)} KB)`);
console.log(`  Repository: ${REPO} (branch ${BRANCH})`);
console.log(`  SEO title (${POST.seoTitle.length}): ${POST.seoTitle}`);
console.log(`  Meta description (${POST.seoDescription.length}): ${POST.seoDescription}`);
console.log(`  GitHub links: ${githubLinks.size}`);
for (const url of githubLinks) console.log(`    ${url}`);
