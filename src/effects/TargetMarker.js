// A slowly spinning ring of four arcs drawn on the ground under a target.
// Pass the current target (anything with x, y, radius) to update() every frame,
// or null to hide it. Reusable by towers.
export class TargetMarker {
  constructor(scene, color) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setVisible(false);
    this.color = color;
    this.drawnRadius = 0;
    this.current = null;
  }

  draw(radius) {
    if (radius === this.drawnRadius) return;
    this.drawnRadius = radius;
    const g = this.graphics.clear();
    g.lineStyle(3, this.color, 0.9);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      g.beginPath().arc(0, 0, radius, a + 0.25, a + Math.PI / 2 - 0.25).strokePath();
    }
  }

  update(target) {
    const g = this.graphics;
    if (!target || !target.alive) {
      g.setVisible(false);
      this.current = null;
      return;
    }
    this.draw(target.radius + 7);
    if (target !== this.current) {
      // Snap in when switching targets.
      this.current = target;
      g.setScale(1.5).setAlpha(0);
      this.scene.tweens.killTweensOf(g);
      this.scene.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 120, ease: 'Quad.easeOut' });
    }
    g.setVisible(true).setPosition(target.x, target.y).setDepth(target.y - 1);
    g.rotation += this.scene.game.loop.delta * 0.002;
  }
}
