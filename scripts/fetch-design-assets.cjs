const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../design/assets');
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const [name, url] of [['openai-brand', 'https://openai.com/brand/'], ['claude-home', 'https://claude.com/']]) {
    const response = await fetch(url); const text = await response.text();
    fs.writeFileSync(path.join(out, name + '.html'), text);
    const links = [...text.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m => m[1]).filter(url => /(?:\.svg|\.zip|favicon|apple-touch-icon)/i.test(url));
    console.log(name, response.status, JSON.stringify([...new Set(links)].slice(0, 35)));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
