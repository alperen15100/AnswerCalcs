import fs from 'node:fs/promises';
import path from 'node:path';

const DIST=path.resolve('dist');
const BASE=(process.env.BASE_PATH??'/AnswerCalcs').replace(/\/$/,'');
const expectedSitemaps=['sitemap.xml','sitemaps/core.xml','sitemaps/time-date.xml','sitemaps/math.xml','sitemaps/converters.xml','sitemaps/money.xml','sitemaps/geometry.xml'];

async function walk(dir){
 const out=[];
 for(const e of await fs.readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory())out.push(...await walk(p));else out.push(p);
 }
 return out;
}
const files=await walk(DIST);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const canonicals=new Map();
let broken=0;

function localTarget(href){
 if(!href||href.startsWith('http:')||href.startsWith('https:')||href.startsWith('mailto:')||href.startsWith('#'))return null;
 let h=href.split('#')[0].split('?')[0];
 if(BASE&&h.startsWith(BASE))h=h.slice(BASE.length)||'/';
 if(!h.startsWith('/'))return null;
 if(h==='/')return path.join(DIST,'index.html');
 if(/\.[a-z0-9]+$/i.test(h))return path.join(DIST,h.slice(1));
 return path.join(DIST,h.slice(1),'index.html');
}

for(const file of htmlFiles){
 const s=await fs.readFile(file,'utf8');
 const rel=path.relative(DIST,file);
 if(!/<title>[^<]{3,}<\/title>/i.test(s))throw new Error('Missing title: '+rel);
 if(!/<meta name="description" content="[^"]{20,}"/i.test(s))throw new Error('Missing/short meta description: '+rel);
 const cm=s.match(/<link rel="canonical" href="([^"]+)"/i);
 if(!cm)throw new Error('Missing canonical: '+rel);
 if(rel!=='404.html'){
  if(canonicals.has(cm[1]))throw new Error('Duplicate canonical: '+cm[1]+' in '+rel+' and '+canonicals.get(cm[1]));
  canonicals.set(cm[1],rel);
 }
 const h1=(s.match(/<h1\b/gi)||[]).length;
 if(h1!==1)throw new Error('Expected exactly one H1 in '+rel+', found '+h1);
 if(!s.includes('application/ld+json'))throw new Error('Missing JSON-LD: '+rel);
 if(/launch URLs|No AI API/i.test(s))throw new Error('Developer jargon leaked into '+rel);
 for(const m of s.matchAll(/href="([^"]+)"/g)){
  const target=localTarget(m[1]);
  if(target){try{await fs.access(target)}catch{broken++;if(broken<12)console.error('Broken local link:',rel,'->',m[1])}}
 }
}
if(broken)throw new Error('Broken local links found: '+broken);
for(const f of expectedSitemaps){await fs.access(path.join(DIST,f))}
const index=await fs.readFile(path.join(DIST,'sitemap.xml'),'utf8');
if(!index.includes('<sitemapindex'))throw new Error('sitemap.xml is not a sitemap index');
for(const n of ['core','time-date','math','converters','money','geometry'])if(!index.includes('/sitemaps/'+n+'.xml'))throw new Error('Missing sitemap segment in index: '+n);
console.log(`SEO audit passed: ${htmlFiles.length} HTML pages, unique canonicals, one H1 each, JSON-LD present, internal links valid, segmented sitemaps present.`);
