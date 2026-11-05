import { VISUALS } from '../visuals.js';

// Small textures drawn once at boot and shared by every scene:
//   icon-wood / icon-stone / icon-gold / icon-heart / icon-skull   UI + pad icons
//   fx-px, fx-dot, fx-soft, fx-chip, fx-spark                      particles / tinted pieces (white)
//   soft-shadow                                                    radial shadow blob
//   vignette                                                       radial darkening overlay
export function ensureTextures(scene) {
  const tex = scene.textures;
  if (tex.exists('icon-wood')) return;

  const draw = (key, w, h, fn) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  draw('icon-wood', 24, 16, (g) => {
    g.fillStyle(0x5a3a1e, 1).fillRoundedRect(1, 2, 20, 12, 4);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(2, 3, 18, 10, 3);
    g.fillStyle(0xa47148, 1).fillRect(4, 5, 12, 2);
    g.fillStyle(0x5a3a1e, 1).fillCircle(19, 8, 5);
    g.fillStyle(0xd7a86e, 1).fillCircle(19, 8, 4);
    g.lineStyle(1, 0xa47148, 1).strokeCircle(19, 8, 2);
  });
  draw('icon-stone', 22, 18, (g) => {
    g.fillStyle(0x5f5f5f, 1).fillPoints([
      { x: 2, y: 13 }, { x: 5, y: 4 }, { x: 12, y: 1 }, { x: 19, y: 5 }, { x: 21, y: 13 }, { x: 14, y: 17 }, { x: 6, y: 17 },
    ], true);
    g.fillStyle(0x9e9e9e, 1).fillPoints([
      { x: 4, y: 12 }, { x: 6, y: 5 }, { x: 12, y: 3 }, { x: 18, y: 6 }, { x: 19, y: 12 }, { x: 13, y: 15 }, { x: 7, y: 15 },
    ], true);
    g.fillStyle(0xd0d0d0, 1).fillCircle(9, 7, 2.5);
  });
  draw('icon-gold', 22, 18, (g) => {
    g.fillStyle(0x9c7212, 1).fillPoints([
      { x: 2, y: 12 }, { x: 6, y: 4 }, { x: 13, y: 2 }, { x: 20, y: 7 }, { x: 19, y: 14 }, { x: 10, y: 17 },
    ], true);
    g.fillStyle(0xf2c94c, 1).fillPoints([
      { x: 4, y: 11 }, { x: 7, y: 5 }, { x: 13, y: 4 }, { x: 18, y: 8 }, { x: 17, y: 13 }, { x: 10, y: 15 },
    ], true);
    g.fillStyle(0xfff8d6, 1).fillCircle(9, 7, 2);
  });
  draw('icon-heart', 22, 20, (g) => {
    g.fillStyle(0x7f1d1d, 1).fillCircle(7, 7, 6).fillCircle(15, 7, 6).fillTriangle(1, 9, 21, 9, 11, 19);
    g.fillStyle(0xe53935, 1).fillCircle(7, 7, 5).fillCircle(15, 7, 5).fillTriangle(2.5, 9, 19.5, 9, 11, 17.5);
    g.fillStyle(0xffcdd2, 1).fillCircle(6, 5, 1.8);
  });
  draw('icon-skull', 20, 20, (g) => {
    g.fillStyle(0x9e9e9e, 1).fillCircle(10, 9, 8).fillRect(5, 12, 10, 7);
    g.fillStyle(0xf5f5f5, 1).fillCircle(10, 9, 7).fillRect(6, 12, 8, 6);
    g.fillStyle(0x1a1a1a, 1).fillCircle(7, 9, 2.4).fillCircle(13, 9, 2.4);
    g.fillRect(8, 16, 1.5, 3).fillRect(11, 16, 1.5, 3);
  });

  draw('fx-px', 2, 2, (g) => g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2));
  draw('fx-dot', 8, 8, (g) => g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4));
  draw('fx-chip', 7, 3, (g) => g.fillStyle(0xffffff, 1).fillRect(0, 0, 7, 3));
  draw('fx-spark', 6, 2, (g) => g.fillStyle(0xffffff, 1).fillRect(0, 0, 6, 2));

  radial(scene, 'fx-soft', 16, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  radial(scene, 'soft-shadow', VISUALS.SHADOW.TEXTURE_SIZE, [
    [0, 'rgba(0,0,0,1)'], [0.45, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)'],
  ]);
  const V = VISUALS.VIGNETTE;
  radial(scene, 'vignette', 256, [
    [0, 'rgba(0,0,0,0)'], [V.INNER, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${V.ALPHA})`],
  ], 0.72);
}

// Square canvas texture with a radial gradient. `reach` stretches the gradient
// (0.5 = ends at the edge midpoints, ~0.71 = ends at the corners).
function radial(scene, key, size, stops, reach = 0.5) {
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.getContext();
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, size * reach);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

// A soft shadow blob centred at (x, y), w x h pixels.
export function softShadow(scene, x, y, w, h, alpha) {
  return scene.add.image(x, y, 'soft-shadow').setDisplaySize(w, h).setAlpha(alpha);
}
