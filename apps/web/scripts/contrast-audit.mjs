import { chromium } from '@playwright/test';
const b = await chromium.launch();
const URLS = ['/', '/how-it-works', '/pricing', '/safety', '/explore'];
let bad = 0;
for (const scheme of ['light','dark']) {
  const ctx = await b.newContext({ viewport:{width:1280,height:900}, colorScheme:scheme, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  for (const u of URLS) {
    await p.goto('http://127.0.0.1:3100'+u, {waitUntil:'networkidle'});
    await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('revealed')));
    const res = await p.evaluate(() => {
      const lum = (r,g,b2) => { const f=c=>{c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
        return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b2); };
      // Tailwind's /opacity modifiers compile to color-mix(in oklab, …), which
      // Chrome serialises as oklab(L a b / alpha). Naively regexing the numbers
      // out of that reads an oklab triple as if it were rgb — so convert.
      const gam = c => { const v = c<=0.0031308 ? 12.92*c : 1.055*Math.pow(c,1/2.4)-0.055;
        return Math.max(0, Math.min(255, Math.round(v*255))); };
      const oklab2rgb = (L,a,bb) => {
        const l=(L+0.3963377774*a+0.2158037573*bb)**3;
        const m=(L-0.1055613458*a-0.0638541728*bb)**3;
        const s=(L-0.0894841775*a-1.2914855480*bb)**3;
        return [gam(4.0767416621*l-3.3077115913*m+0.2309699292*s),
                gam(-1.2684380046*l+2.6097574011*m-0.3413193965*s),
                gam(-0.0041960863*l-0.7034186147*m+1.7076147010*s)];
      };
      const parse = s => {
        const n=(s.match(/-?[\d.]+/g)||[]).map(Number);
        if(/^oklab/.test(s)) return [...oklab2rgb(n[0],n[1],n[2]), n[3]===undefined?1:n[3]];
        return n;
      };
      const over = (fg,bg) => { const a=fg[3]===undefined?1:fg[3];
        return [0,1,2].map(i=>Math.round(fg[i]*a+bg[i]*(1-a))); };
      const bgOf = el => { let n=el;
        while(n && n!==document.documentElement){ const c=parse(getComputedStyle(n).backgroundColor);
          if(c.length>=3 && (c[3]===undefined||c[3]>0.95)) return c.slice(0,3); n=n.parentElement; }
        return parse(getComputedStyle(document.body).backgroundColor).slice(0,3); };
      const out=[];
      for (const el of document.querySelectorAll('body *')) {
        const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');
        if(!txt) continue;
        const cs=getComputedStyle(el);
        if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) continue;
        const bg=bgOf(el); const fg=over(parse(cs.color),bg);
        const L1=lum(...fg), L2=lum(...bg);
        const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
        const size=parseFloat(cs.fontSize), wt=parseInt(cs.fontWeight)||400;
        const large = size>=24 || (size>=18.66 && wt>=700);
        const need = large?3:4.5;
        if(ratio<need) out.push({t:txt.slice(0,42), ratio:+ratio.toFixed(2), need, size, cls:el.className.toString().slice(0,60)});
      }
      return out;
    });
    if(res.length){ bad+=res.length; console.log(`\n[FAIL] ${scheme} ${u}`); res.forEach(r=>console.log('   ',JSON.stringify(r))); }
  }
  await ctx.close();
}
await b.close();
console.log(bad===0 ? '\nAA: all text pairs pass' : `\nAA: ${bad} failing pairs`);
