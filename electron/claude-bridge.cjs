// Whitelist only: never store prompts, transcript paths, tokens or session IDs.
const fs = require('node:fs');
const path = require('node:path');
const { claudeLimits } = require('./limits.cjs');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; if (input.length > 2 * 1024 * 1024) process.exit(1); });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const windows = claudeLimits(data);
    if (windows.length) {
      const target = path.join(process.env.CLAUDE_CONFIG_DIR, 'udv-usage.json');
      const temp = `${target}.${process.pid}.tmp`;
      fs.writeFileSync(temp, JSON.stringify({ updatedAt: Date.now(), windows }), { mode: 0o600 });
      fs.renameSync(temp, target);
    }
    process.stdout.write(windows.length ? windows.map(w => `${w.label}: ${Math.round(w.usedPercent)}%`).join(' · ') : 'UDV · aguardando limites');
  } catch { process.stdout.write('UDV · limites indisponíveis'); }
});
