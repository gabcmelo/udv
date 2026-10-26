const fs = require('node:fs');
const path = require('node:path');
const defaults = { theme: 'system', reduceTransparency: false };
class Settings {
  constructor(root) {
    this.file = path.join(root, 'preferences.json'); this.value = { ...defaults };
    try { this.update(JSON.parse(fs.readFileSync(this.file, 'utf8')), false); } catch (error) { if (error.code !== 'ENOENT') this.value = { ...defaults }; }
  }
  update(patch, save = true) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Preferências inválidas.');
    if ('theme' in patch) { if (!['system', 'light', 'dark'].includes(patch.theme)) throw new Error('Tema inválido.'); this.value.theme = patch.theme; }
    if ('reduceTransparency' in patch) { if (typeof patch.reduceTransparency !== 'boolean') throw new Error('Preferência inválida.'); this.value.reduceTransparency = patch.reduceTransparency; }
    if (save) { fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.value), { mode: 0o600 }); fs.renameSync(this.file + '.tmp', this.file); }
    return this.value;
  }
}
module.exports = { Settings };
