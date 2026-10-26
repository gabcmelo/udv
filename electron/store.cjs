const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
class Store {
  constructor(root) {
    this.root = root; this.file = path.join(root, 'accounts.json');
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    try { this.accounts = JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Cadastro local inválido. Preserve accounts.json antes de restaurar um backup.'); this.accounts = []; }
    if (!Array.isArray(this.accounts) || this.accounts.some(a => !/^[a-f0-9-]{36}$/.test(a.id) || !['claude', 'codex'].includes(a.provider))) throw new Error('Cadastro local inválido.');
  }
  save() { fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.accounts, null, 2), { mode: 0o600 }); fs.renameSync(this.file + '.tmp', this.file); }
  add(provider, label) {
    if (!['claude', 'codex'].includes(provider) || typeof label !== 'string' || !label.trim() || label.length > 60) throw new Error('Informe o provedor e um nome de até 60 caracteres.');
    const account = { id: randomUUID(), provider, label: label.trim(), createdAt: Date.now() };
    fs.mkdirSync(this.directory(account.id), { recursive: true, mode: 0o700 });
    this.accounts.push(account); this.save(); return account;
  }
  get(id) { const account = this.accounts.find(a => a.id === id); if (!account) throw new Error('Conta não encontrada.'); return account; }
  update(id, patch) {
    const account = this.get(id);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Dados inválidos.');
    if ('favorite' in patch) { if (typeof patch.favorite !== 'boolean') throw new Error('Favorito inválido.'); account.favorite = patch.favorite; }
    if ('label' in patch) { if (typeof patch.label !== 'string' || !patch.label.trim() || patch.label.length > 60) throw new Error('Informe um nome de até 60 caracteres.'); account.label = patch.label.trim(); }
    this.save(); return account;
  }
  directory(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identificador inválido.');
    return path.join(this.root, 'profiles', id);
  }
  remove(id) {
    this.get(id);
    const target = path.resolve(this.directory(id));
    const parent = path.resolve(this.root, 'profiles') + path.sep;
    if (!target.startsWith(parent)) throw new Error('Perfil inválido.');
    fs.rmSync(target, { recursive: true, force: true });
    this.accounts = this.accounts.filter(a => a.id !== id); this.save();
  }
}
module.exports = { Store };
