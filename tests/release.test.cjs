const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { validateVersion, releaseNotes, expectedAssets, validateArtifacts } = require('../scripts/validate-release.cjs');

const version = '0.1.0';
const digest = value => createHash('sha512').update(value).digest('base64');

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'udv-release-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const packages = expectedAssets(version).filter(file => file.endsWith('.exe') || file.endsWith('.zip') || file.endsWith('.dmg'));
  for (const file of expectedAssets(version).filter(file => !file.endsWith('.yml'))) {
    await fs.writeFile(path.join(directory, file), `fixture:${file}`);
  }
  const entries = await Promise.all(packages.map(async file => {
    const data = await fs.readFile(path.join(directory, file));
    return { url: file, size: data.length, sha512: digest(data) };
  }));
  for (const [name, extension] of [['latest.yml', '.exe'], ['latest-mac.yml', '.zip']]) {
    const files = entries.filter(entry => name === 'latest.yml' ? entry.url.endsWith('.exe') : !entry.url.endsWith('.exe'));
    const legacy = files.find(entry => entry.url.endsWith(extension));
    await fs.writeFile(path.join(directory, name), JSON.stringify({ version, files, path: legacy.url, sha512: legacy.sha512 }));
  }
  return directory;
}

async function editManifest(directory, name, edit) {
  const file = path.join(directory, name);
  const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
  edit(manifest);
  await fs.writeFile(file, JSON.stringify(manifest));
}

test('release tag must exactly match a stable package and both root lock versions', () => {
  const input = { version, tag: `v${version}`, lockVersion: version, rootLockVersion: version };
  assert.equal(validateVersion(input), version);
  for (const overrides of [
    { tag: '0.1.0' }, { tag: 'v0.1.1' }, { lockVersion: '0.2.0' }, { rootLockVersion: undefined },
    { version: '0.1.0-beta.1', tag: 'v0.1.0-beta.1' }, { version: '00.1.0' },
  ]) assert.throws(() => validateVersion({ ...input, ...overrides }));
});

test('release notes require a finalized matching changelog section, not a different version', () => {
  const changelog = '# Changelog\n\n## 0.2.0 — Em desenvolvimento\n\nPróxima entrega.\n\n## 0.1.0 — 2026-10-26\n\n- Primeira entrega.\n\n## 0.0.1\n\nAntiga.\n';
  assert.equal(releaseNotes(changelog, version), '- Primeira entrega.\n');
  assert.throws(() => releaseNotes(changelog, '0.2.0'), /Finalize/);
  assert.throws(() => releaseNotes(changelog, '0.3.0'), /não contém/);
  assert.throws(() => releaseNotes('## 0.1.0\n\n', version), /vazias/);
  assert.throws(() => releaseNotes('## 0.1.00\n\nOutra versão.', version), /não contém/);
});

test('complete Windows and both macOS architectures pass release validation', async t => {
  const directory = await fixture(t);
  assert.deepEqual(await validateArtifacts(directory, version), expectedAssets(version));
  assert.equal(expectedAssets(version).length, 12);
});

test('missing or empty package auxiliaries prevent a partial release', async t => {
  const directory = await fixture(t);
  const file = `UDV-${version}-macOS-arm64.zip.blockmap`;
  await fs.unlink(path.join(directory, file));
  await assert.rejects(validateArtifacts(directory, version), /ausente/);
  await fs.writeFile(path.join(directory, file), '');
  await assert.rejects(validateArtifacts(directory, version), /inválido/);
});

test('mac manifest must reference both architecture packages even if files exist', async t => {
  const directory = await fixture(t);
  await editManifest(directory, 'latest-mac.yml', manifest => {
    manifest.files = manifest.files.filter(entry => !entry.url.includes('arm64'));
  });
  await assert.rejects(validateArtifacts(directory, version), /todos os pacotes/);
});

test('corruption and wrong sizes cannot pass manifest integrity checks', async t => {
  const directory = await fixture(t);
  const file = `UDV-${version}-Windows-x64.exe`;
  const original = await fs.readFile(path.join(directory, file));
  const corrupted = Buffer.from(original);
  corrupted[0] ^= 1;
  await fs.writeFile(path.join(directory, file), corrupted);
  await assert.rejects(validateArtifacts(directory, version), /SHA-512/);
  await fs.writeFile(path.join(directory, file), original);
  await editManifest(directory, 'latest.yml', manifest => { manifest.files[0].size++; });
  await assert.rejects(validateArtifacts(directory, version), /Tamanho/);
});

test('unexpected assets and manifest references are rejected', async t => {
  const directory = await fixture(t);
  await fs.writeFile(path.join(directory, 'another-installer.exe'), 'unexpected');
  await assert.rejects(validateArtifacts(directory, version), /inesperados/);
  await fs.unlink(path.join(directory, 'another-installer.exe'));
  await editManifest(directory, 'latest.yml', manifest => { manifest.files[0].url = 'https://example.com/installer.exe'; });
  await assert.rejects(validateArtifacts(directory, version), /Referência/);
});

test('manifest version, duplicate entries and inconsistent legacy fields are rejected', async t => {
  const directory = await fixture(t);
  await editManifest(directory, 'latest.yml', manifest => { manifest.version = '0.2.0'; });
  await assert.rejects(validateArtifacts(directory, version), /incompatível/);
  await editManifest(directory, 'latest.yml', manifest => { manifest.version = version; manifest.files.push(manifest.files[0]); });
  await assert.rejects(validateArtifacts(directory, version), /Referência/);
  await editManifest(directory, 'latest.yml', manifest => { manifest.files.pop(); manifest.sha512 = 'wrong'; });
  await assert.rejects(validateArtifacts(directory, version), /legados inconsistentes/);
});
