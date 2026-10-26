const { test } = require('node:test');
const assert = require('node:assert/strict');
const { popupBounds } = require('../electron/popup-bounds.cjs');
function contained(result, area) {
  assert.ok(result.x >= area.x && result.y >= area.y);
  assert.ok(result.x + result.width <= area.x + area.width);
  assert.ok(result.y + result.height <= area.y + area.height);
}
test('bottom, top and side taskbars keep popup inside work area', () => {
  const area = { x: 0, y: 0, width: 1920, height: 1032 };
  const bottom = popupBounds(area, { x: 1860, y: 1040, width: 24, height: 24 }, 470);
  contained(bottom, area); assert.equal(bottom.width, 380); assert.equal(bottom.y, 554);
  const topArea = { x: 0, y: 48, width: 1920, height: 1032 };
  const top = popupBounds(topArea, { x: 1700, y: 12, width: 24, height: 24 }, 470);
  assert.equal(top.y, 56); contained(top, topArea);
  const sideArea = { x: 60, y: 0, width: 1860, height: 1080 };
  const side = popupBounds(sideArea, { x: 12, y: 900, width: 24, height: 24 }, 560);
  assert.equal(side.x, 68); contained(side, sideArea);
});
test('negative-coordinate monitors, high DPI work areas, and oversized content are bounded', () => {
  const area = { x: -1280, y: -300, width: 1280, height: 650 };
  const result = popupBounds(area, { x: -24, y: 360, width: 24, height: 20 }, 5000);
  assert.equal(result.height, 560); contained(result, area);
  const small = { x: 1200, y: 20, width: 340, height: 220 };
  contained(popupBounds(small, { x: 1520, y: 210, width: 12, height: 12 }, 1000), small);
});
