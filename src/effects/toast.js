// Floating world-space text that rises and fades, e.g. "Archery Tower built!".
export function toast(scene, x, y, message, color = '#ffffff') {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setScale(scene.worldTextScale ?? 1) // readable when a phone zooms the camera out
    .setDepth(1e6 + 1);
  scene.tweens.add({
    targets: text,
    y: y - 60,
    alpha: { from: 1, to: 0 },
    duration: 1600,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
}
