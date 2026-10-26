const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { runIconsTool } = require('app-builder-lib/out/toolsets/icons');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'electron', 'assets');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const source = path.join(output, 'icon.svg');
  const symbol = await fs.readFile(path.join(output, 'symbol.svg'), 'utf8');
  const tones = { dark: '#232323', light: '#eeeeee', template: '#000000' };
  const badges = ['ok', 'unknown', 'near', 'exhausted'];
  const scales = [[16, ''], [32, '@2x'], [48, '@3x']];
  const generated = ['icon.ico', 'icon.icns', 'icon.png', 'icon@2x.png', ...Object.keys(tones).flatMap(tone => badges.flatMap(badge => scales.map(([, suffix]) => `tray-${tone}-${badge}${suffix}.png`)))];
  const stamp = path.join(output, '.generated.sha256');
  const hash = createHash('sha256').update(await fs.readFile(source)).update(symbol)
    .update(await fs.readFile(__filename)).update(require('app-builder-lib/package.json').version).digest('hex');
  if (process.argv.includes('--if-needed') && await fs.readFile(stamp, 'utf8').catch(() => '') === hash) {
    const present = await Promise.all(generated.map(file => fs.stat(path.join(output, file)).then(stat => stat.isFile() && stat.size > 0).catch(() => false)));
    if (present.every(Boolean)) return;
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'udv-icons-'));
  // Only the task-owned directory returned by mkdtemp may be recursively removed.
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('udv-icons-')) {
    throw new Error('Diretório temporário de ícones inválido.');
  }
  try {
    const mark = symbol.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)?.[1];
    if (!mark) throw new Error('SVG do símbolo inválido.');

    for (const format of ['ico', 'icns', 'set']) {
      await runIconsTool({ inputFile: source, outputFormat: format, outDir: temporary });
    }
    await fs.copyFile(path.join(temporary, 'icon.ico'), path.join(output, 'icon.ico'));
    await fs.copyFile(path.join(temporary, 'icon.icns'), path.join(output, 'icon.icns'));
    await fs.copyFile(path.join(temporary, '256x256.png'), path.join(output, 'icon.png'));
    await fs.copyFile(path.join(temporary, '512x512.png'), path.join(output, 'icon@2x.png'));

    for (const [tone, color] of Object.entries(tones)) {
      for (const badge of badges) {
        const accent = tone === 'template' ? color : badge === 'near' ? '#e8b04a' : '#f0685c';
        const overlay = badge === 'unknown'
          ? `<circle cx="26" cy="26" r="3.5" fill="none" stroke="${color}" stroke-width="2"/>`
          : badge === 'near'
            ? `<path d="m26 21 5 9H21Z" fill="${accent}"/>`
            : badge === 'exhausted' ? `<circle cx="26" cy="26" r="4.5" fill="${accent}"/>` : '';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="color:${color}"><defs><mask id="badge"><rect width="32" height="32" fill="white"/>${overlay ? '<circle cx="26" cy="26" r="6.5" fill="black"/>' : ''}</mask></defs><g mask="url(#badge)">${mark}</g>${overlay}</svg>`;
        const inputFile = path.join(temporary, 'tray.svg');
        await fs.writeFile(inputFile, svg);
        await runIconsTool({ inputFile, outputFormat: 'set', outDir: temporary });
        for (const [size, suffix] of scales) {
          await fs.copyFile(path.join(temporary, `${size}x${size}.png`), path.join(output, `tray-${tone}-${badge}${suffix}.png`));
        }
      }
    }
    await fs.writeFile(stamp, hash);
    console.log('Órbita: SVG, ICO, ICNS, PNG e bandeja 1x/2x/3x gerados.');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
