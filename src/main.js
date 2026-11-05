import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Two touch points: one steers while another can tap a button.
  input: { activePointers: 2 },
  disableContextMenu: true, // long-press shouldn't open a menu

  scene: [GameScene, UIScene],
});

// Handy for debugging in the browser console (dev server only).
if (import.meta.env.DEV) window.__game = game;
