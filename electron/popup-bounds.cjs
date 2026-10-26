const clamp = (number, low, high) => Math.min(Math.max(number, low), Math.max(low, high));
function popupBounds(workArea, anchor, requestedHeight = 470, displayBounds = workArea, platform = process.platform) {
  const gap = 8;
  const width = Math.min(380, workArea.width - gap * 2);
  const height = clamp(Math.ceil(requestedHeight), Math.min(170, workArea.height - gap * 2), Math.min(560, workArea.height - gap * 2));
  const center = { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height / 2 };
  let x = center.x - width / 2, y;
  if (center.y >= workArea.y + workArea.height) y = workArea.y + workArea.height - height - gap;
  else if (center.y <= workArea.y || platform === 'darwin') y = workArea.y + gap;
  else if (center.x < workArea.x) { x = workArea.x + gap; y = center.y - height / 2; }
  else if (center.x >= workArea.x + workArea.width) { x = workArea.x + workArea.width - width - gap; y = center.y - height / 2; }
  else {
    // Hidden/overflow tray: the observed click point is a safer fallback than the primary display.
    y = center.y > displayBounds.y + displayBounds.height / 2 ? center.y - height - gap : center.y + gap;
  }
  return { x: Math.round(clamp(x, workArea.x + gap, workArea.x + workArea.width - width - gap)),
    y: Math.round(clamp(y, workArea.y + gap, workArea.y + workArea.height - height - gap)), width, height };
}
module.exports = { popupBounds };
