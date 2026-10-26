const fs = require('node:fs');
const path = require('node:path');

// Keep profiles in place: Claude credentials and launchers can depend on their paths.
function dataDirectory(appData, packaged = false) {
  const names = packaged ? ['Usage Dash View', 'usage-dash-view', 'Lumebar'] : ['usage-dash-view', 'Usage Dash View', 'Lumebar'];
  for (const name of names) {
    const directory = path.join(appData, name);
    if (['accounts.json', 'preferences.json', 'profiles'].some(file => fs.existsSync(path.join(directory, file)))) return directory;
  }
  return path.join(appData, packaged ? 'Usage Dash View' : 'usage-dash-view');
}

module.exports = { dataDirectory };
