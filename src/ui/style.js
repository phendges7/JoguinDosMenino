import { VISUALS } from '../visuals.js';

// Shared HUD look: rounded panels, text styles, icons and the counter bump.

export function textStyle(size, extra = {}) {
  return {
    fontFamily: 'Arial', fontSize: `${size}px`, color: '#ffffff',
    stroke: '#000000', strokeThickness: Math.max(3, Math.round(size / 6)), ...extra,
  };
}

// Rounded panel drawn into a Graphics at (x, y) with size w x h.
export function drawPanel(g, x, y, w, h, radius = VISUALS.UI.PANEL_RADIUS) {
  const U = VISUALS.UI;
  g.fillStyle(0x000000, 0.25).fillRoundedRect(x + 2, y + 3, w, h, radius); // drop shadow
  g.fillStyle(U.PANEL_COLOR, U.PANEL_ALPHA).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, U.PANEL_BORDER, U.PANEL_BORDER_ALPHA).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, radius - 1);
  g.lineStyle(1, 0xffffff, 0.08).lineBetween(x + radius, y + 3, x + w - radius, y + 3); // top highlight
  return g;
}

export function panel(scene, x, y, w, h, radius) {
  return drawPanel(scene.add.graphics(), x, y, w, h, radius);
}

// Resource / UI icon image (icon-wood, icon-heart, ...) scaled to `size` px tall.
export function icon(scene, x, y, key, size = VISUALS.UI.ICON_SIZE) {
  const img = scene.add.image(x, y, key);
  img.setScale(size / img.height);
  img.baseScale = img.scale;
  return img;
}

// Counter bump: pop the text (and icon) and flash the text colour.
export function bump(scene, text, iconImg) {
  const U = VISUALS.UI;
  scene.tweens.killTweensOf(text);
  text.setScale(U.BUMP_SCALE).setColor(U.BUMP_FLASH);
  scene.tweens.add({
    targets: text, scale: 1, duration: U.BUMP_DURATION, ease: 'Back.easeOut',
    onComplete: () => text.setColor('#ffffff'),
  });
  if (iconImg) {
    scene.tweens.killTweensOf(iconImg);
    iconImg.setScale(iconImg.baseScale * U.BUMP_SCALE);
    scene.tweens.add({ targets: iconImg, scale: iconImg.baseScale, duration: U.BUMP_DURATION, ease: 'Back.easeOut' });
  }
}
