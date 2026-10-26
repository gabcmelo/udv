const os = require('node:os');
// The optional macOS module is never loaded on Windows. No private/unstable API calls.
function createMaterials(nativeTheme, settings, app) {
  let glass;
  if (process.platform === 'darwin' && Number(app.getSystemVersion().split('.')[0]) >= 26) {
    try { const imported = require('electron-liquid-glass'); glass = imported.default || imported; } catch {}
  }
  const attached = new WeakSet();
  const reduced = () => settings.value.reduceTransparency || nativeTheme.prefersReducedTransparency || nativeTheme.shouldUseHighContrastColors;
  function apply(window, role) {
    const dark = nativeTheme.shouldUseDarkColors;
    if (reduced()) {
      if (process.platform === 'win32') window.setBackgroundMaterial('none');
      if (process.platform === 'darwin') window.setVibrancy(null);
      window.setBackgroundColor(dark ? '#262626' : '#f3f3f3'); return 'solid';
    }
    if (process.platform === 'win32' && Number(os.release().split('.')[2]) >= 22621) {
      window.setBackgroundColor('#00000000'); window.setBackgroundMaterial(role === 'popup' ? 'acrylic' : 'mica'); return role === 'popup' ? 'acrylic' : 'mica';
    }
    if (process.platform === 'darwin') {
      window.setBackgroundColor('#00000000');
      if (glass && role === 'popup') {
        try {
          window.setVibrancy(null);
          if (!attached.has(window)) { glass.addView(window.getNativeWindowHandle(), { cornerRadius: 18 }); attached.add(window); }
          return 'liquid-glass';
        } catch {}
      }
      window.setVibrancy(role === 'popup' ? 'popover' : 'under-window'); return 'vibrancy';
    }
    window.setBackgroundColor(dark ? '#262626' : '#f3f3f3'); return 'solid';
  }
  return { reduced, apply, hasGlass: window => attached.has(window) };
}
module.exports = { createMaterials };
