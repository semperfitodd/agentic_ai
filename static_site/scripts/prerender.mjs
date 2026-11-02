#!/usr/bin/env node
// Writes static HTML per route (with route-specific head tags) plus sitemap.xml and robots.txt.
// SITE_URL (e.g. https://app.example.com) is required for canonical URLs and the sitemap.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INDEXED_PATHS, OG_IMAGE_PATH, PAGE_META, SITE_NAME, structuredData } from '../src/config/seo.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, 'dist-ssr');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '');

if (!/^https:\/\/[^/]+$/.test(siteUrl)) {
    console.error('SITE_URL must be set to the site origin, e.g. SITE_URL=https://app.example.com');
    process.exit(1);
}

const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const headTags = ({ path, title, description, noindex }) => {
    const url = `${siteUrl}${path}`;
    const image = `${siteUrl}${OG_IMAGE_PATH}`;
    const tags = [
        `<link rel="canonical" href="${url}" />`,
        noindex ? '<meta name="robots" content="noindex, follow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />',
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:image" content="${image}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        `<meta name="twitter:image" content="${image}" />`,
        `<script type="application/ld+json">${JSON.stringify(structuredData(siteUrl)).replace(/</g, '\\u003c')}</script>`,
    ];
    return tags.join('\n    ');
};

const { render } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');

for (const [route, meta] of Object.entries(PAGE_META)) {
    const html = template
        .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(meta.description)}" />`)
        .replace('<!--seo-->', headTags(meta))
        .replace('<div id="root"></div>', `<div id="root">${render(route)}</div>`);
    const file = meta.path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${meta.path}`, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
}

const today = new Date().toISOString().split('T')[0];
writeFileSync(
    resolve(dist, 'sitemap.xml'),
    [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...INDEXED_PATHS.map((path) => `  <url><loc>${siteUrl}${path}</loc><lastmod>${today}</lastmod></url>`),
        '</urlset>',
        '',
    ].join('\n')
);
writeFileSync(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
rmSync(ssrDir, { recursive: true, force: true });
console.log(`Prerendered ${Object.keys(PAGE_META).length} routes for ${siteUrl}`);
