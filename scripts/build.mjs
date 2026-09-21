import fs from 'node:fs/promises';
import path from 'node:path';
import worker, { sitemap } from '../src/index.js';

const DIST = path.resolve('dist');
const BASE_PATH = (process.env.BASE_PATH ?? '/AnswerCalcs').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL ?? 'https://alperen15100.github.io/AnswerCalcs').replace(/\/$/, '');
const PROD_PLACEHOLDER = 'https://answercalcs.com';
const PREVIEW_NOINDEX = process.env.PREVIEW_NOINDEX === '1';
const SITEMAP_FILES = ['/sitemap.xml','/sitemaps/core.xml','/sitemaps/time-date.xml','/sitemaps/math.xml','/sitemaps/converters.xml','/sitemaps/money.xml','/sitemaps/geometry.xml'];

const ensure = p => fs.mkdir(p, { recursive: true });
const routeToFile = route => {
  if (route === '/') return path.join(DIST, 'index.html');
  if (/\.[a-z0-9]+$/i.test(route)) return path.join(DIST, route.replace(/^\//, ''));
  return path.join(DIST, route.replace(/^\//, ''), 'index.html');
};

function rewrite(text, contentType='') {
  let out = text.replaceAll(PROD_PLACEHOLDER, SITE_URL);
  if (contentType.includes('html')) {
    const prefix = BASE_PATH || '';
    out = out
      .replaceAll('href="/', `href="${prefix}/`)
      .replaceAll("location.href='/", `location.href='${prefix}/`)
      .replaceAll('src="/', `src="${prefix}/`)
      .replaceAll('action="/', `action="${prefix}/`);
  }
  if (PREVIEW_NOINDEX && contentType.includes('html')) {
    out = out.replaceAll('content="index,follow"', 'content="noindex,follow"');
  }
  return out;
}

await fs.rm(DIST, { recursive: true, force: true });
await ensure(DIST);

const sitemapXml = sitemap();
const routes = [...sitemapXml.matchAll(/<loc>https:\/\/answercalcs\.com([^<]+)<\/loc>/g)].map(m => m[1]);
for (const extra of ['/about/','/privacy/','/terms/','/contact/']) if (!routes.includes(extra)) routes.push(extra);

for (const route of routes) {
  const res = await worker.fetch(new Request(`${PROD_PLACEHOLDER}${route}`));
  if (!res.ok) throw new Error(`Build failed for ${route}: HTTP ${res.status}`);
  const type = res.headers.get('content-type') || 'text/html';
  const body = rewrite(await res.text(), type);
  const file = routeToFile(route);
  await ensure(path.dirname(file));
  await fs.writeFile(file, body);
}

for (const route of ['/robots.txt',...SITEMAP_FILES,'/manifest.webmanifest','/llms.txt']) {
  const res = await worker.fetch(new Request(`${PROD_PLACEHOLDER}${route}`));
  const type = res.headers.get('content-type') || '';
  let body = rewrite(await res.text(), type);
  if (PREVIEW_NOINDEX && route === '/robots.txt') {
    body = 'User-agent: *\nDisallow: /\n';
  }
  const file = routeToFile(route);
  await ensure(path.dirname(file));
  await fs.writeFile(file, body);
}

const nf = await worker.fetch(new Request(`${PROD_PLACEHOLDER}/__404__`));
await fs.writeFile(path.join(DIST, '404.html'), rewrite(await nf.text(), 'text/html'));
await fs.writeFile(path.join(DIST, '.nojekyll'), '');

console.log(`Built ${routes.length} HTML pages for ${SITE_URL}${BASE_PATH ? ` (base path ${BASE_PATH})` : ''}`);
