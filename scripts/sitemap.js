'use strict';

hexo.extend.generator.register('sitemap', function(locals) {
  const config = this.config;
  const siteUrl = (config.url || '').replace(/\/+$/, '');
  const entries = new Map();

  function xmlEscape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function formatDate(date) {
    if (!date || !date.isValid || !date.isValid()) return null;
    return date.format('YYYY-MM-DD');
  }

  function fullUrl(path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    return `${siteUrl}/${encodeURI(cleanPath)}`;
  }

  function addEntry(path, date, permalink) {
    if (!siteUrl || path == null || path === '404/' || path === '404.html') return;
    entries.set(permalink || fullUrl(path), formatDate(date));
  }

  addEntry('', null);

  locals.pages.forEach(function(page) {
    addEntry(page.path, page.updated || page.date, page.permalink);
  });

  locals.posts.forEach(function(post) {
    addEntry(post.path, post.updated || post.date, post.permalink);
  });

  const urls = Array.from(entries.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(function([loc, lastmod]) {
      const lines = [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`
      ];

      if (lastmod) {
        lines.push(`    <lastmod>${lastmod}</lastmod>`);
      }

      lines.push('  </url>');
      return lines.join('\n');
    });

  const data = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join('\n'),
    '</urlset>'
  ].join('\n');

  return {
    path: 'sitemap.xml',
    data
  };
});
