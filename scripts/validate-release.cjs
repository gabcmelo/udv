const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const yaml = require('js-yaml');

function validateVersion({ version, lockVersion, rootLockVersion, tag }) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('O lançamento exige uma versão estável no formato X.Y.Z.');
  }
  if (tag !== `v${version}` || lockVersion !== version || rootLockVersion !== version) {
    throw new Error('Tag, package.json e package-lock.json precisam ter a mesma versão.');
  }
  return version;
}

function releaseNotes(changelog, version) {
  const sections = changelog.split(/^## /m).slice(1);
  const section = sections.find(value => value.split('\n', 1)[0].trim().match(new RegExp(`^${version.replaceAll('.', '\\.')}($|\\s)`)));
  if (!section) throw new Error(`O changelog não contém a versão ${version}.`);
  const [heading, ...body] = section.split('\n');
  if (/em desenvolvimento|unreleased/i.test(heading)) throw new Error('Finalize o changelog antes de criar a tag de lançamento.');
  const notes = body.join('\n').trim();
  if (!notes) throw new Error('As notas da versão não podem estar vazias.');
  return `${notes}\n`;
}

function expectedAssets(version) {
  const installers = [`UDV-${version}-Windows-x64.exe`, ...['arm64', 'x64'].flatMap(arch => ['dmg', 'zip'].map(ext => `UDV-${version}-macOS-${arch}.${ext}`))];
  return [...installers, ...installers.map(file => `${file}.blockmap`), 'latest.yml', 'latest-mac.yml'].sort();
}

async function sha512(file) {
  const hash = createHash('sha512');
  for await (const data of createReadStream(file)) hash.update(data);
  return hash.digest('base64');
}

async function validateArtifacts(directory, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('Versão inválida.');
  const expected = expectedAssets(version);
  const actual = await fs.readdir(directory);
  for (const file of expected) {
    if (!actual.includes(file)) throw new Error(`Artefato obrigatório ausente: ${file}`);
    const stat = await fs.lstat(path.join(directory, file));
    if (!stat.isFile() || stat.size === 0) throw new Error(`Artefato inválido: ${file}`);
  }
  const extras = actual.filter(file => !expected.includes(file));
  if (extras.length) throw new Error(`Artefatos inesperados: ${extras.join(', ')}`);

  for (const [name, required] of [
    ['latest.yml', [`UDV-${version}-Windows-x64.exe`]],
    ['latest-mac.yml', ['arm64', 'x64'].flatMap(arch => ['zip', 'dmg'].map(ext => `UDV-${version}-macOS-${arch}.${ext}`))],
  ]) {
    const manifest = yaml.load(await fs.readFile(path.join(directory, name), 'utf8'), { schema: yaml.JSON_SCHEMA });
    if (!manifest || manifest.version !== version || !Array.isArray(manifest.files)) throw new Error(`Manifesto incompatível: ${name}`);
    const seen = new Set();
    for (const entry of manifest.files) {
      if (!entry || typeof entry.url !== 'string' || !required.includes(entry.url) || seen.has(entry.url)) {
        throw new Error(`Referência de arquivo inválida em ${name}.`);
      }
      seen.add(entry.url);
      const file = path.join(directory, entry.url);
      const stat = await fs.stat(file);
      if (!Number.isSafeInteger(entry.size) || entry.size !== stat.size || entry.sha512 !== await sha512(file)) {
        throw new Error(`Tamanho ou SHA-512 divergente: ${entry.url}`);
      }
    }
    if (required.some(file => !seen.has(file))) throw new Error(`O manifesto ${name} não contém todos os pacotes de suas arquiteturas.`);
    if (manifest.path !== undefined || manifest.sha512 !== undefined) {
      const legacy = manifest.files.find(entry => entry.url === manifest.path);
      if (!legacy || legacy.sha512 !== manifest.sha512) throw new Error(`Campos legados inconsistentes: ${name}`);
    }
  }
  return expected;
}

async function main() {
  const [mode, target, notesOutput] = process.argv.slice(2);
  const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const lock = JSON.parse(await fs.readFile('package-lock.json', 'utf8'));
  const tag = mode === 'version' ? target : process.env.GITHUB_REF_NAME;
  const version = validateVersion({ version: pkg.version, lockVersion: lock.version, rootLockVersion: lock.packages?.['']?.version, tag });
  const notes = releaseNotes(await fs.readFile('CHANGELOG.md', 'utf8'), version);
  if (mode === 'version') {
    if (notesOutput) await fs.writeFile(notesOutput, notes);
    console.log(`Lançamento ${tag}: versão e changelog conferidos.`);
  } else if (mode === 'artifacts' && target) {
    const files = await validateArtifacts(target, version);
    if (notesOutput) await fs.writeFile(notesOutput, `${files.map(file => path.join(target, file)).join('\n')}\n`);
    console.log(`${files.length} artefatos e manifestos de ${tag} conferidos.`);
  } else {
    throw new Error('Uso: node scripts/validate-release.cjs version TAG [NOTAS.md] | artifacts DIRETORIO [LISTA.txt]');
  }
}

module.exports = { validateVersion, releaseNotes, expectedAssets, validateArtifacts };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
