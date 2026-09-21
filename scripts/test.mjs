import worker,{daysFromToday,weeksFromToday,howLongUntil,sitemap} from '../src/index.js';
const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(daysFromToday(30,new Date('2026-09-21T12:00:00Z')).includes('October 21, 2026'),'30-day date failed');
assert(weeksFromToday(6,new Date('2026-09-21T12:00:00Z')).includes('November 2, 2026'),'6-week date failed');
assert(howLongUntil('5-pm').includes('How Long Until 5:00 PM?'),'time route failed');
assert(sitemap().includes('/days-from-today/90/'),'sitemap missing core URL');
const r=await worker.fetch(new Request('https://example.com/percentage-calculator/'));assert(r.status===200,'worker route failed');
console.log('All AnswerCalcs tests passed.');
