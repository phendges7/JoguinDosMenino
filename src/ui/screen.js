import Phaser from 'phaser';
import { VISUALS } from '../visuals.js';

// Screen helpers shared by both scenes: safe-area insets, touch detection,
// camera zoom and HUD scale for the current screen size.

// Notch / home-bar insets in CSS px (set as CSS variables in index.html).
export function safeArea() {
  const s = getComputedStyle(document.documentElement);
  const n = (v) => parseFloat(s.getPropertyValue(v)) || 0;
  return { top: n('--sat'), right: n('--sar'), bottom: n('--sab'), left: n('--sal') };
}

// True on phones / tablets (primary input is a finger).
export function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

// Zoom so the short side of the screen shows at least MIN_VISIBLE_WORLD px of world.
export function cameraZoom(width, height) {
  const M = VISUALS.MOBILE;
  return Phaser.Math.Clamp(Math.min(width, height) / M.MIN_VISIBLE_WORLD, M.MIN_ZOOM, 1);
}

// HUD scale: 1 on desktop-sized screens, smaller on phones.
export function uiScale(width, height) {
  const M = VISUALS.MOBILE;
  const s = Math.min(width / M.UI_REFERENCE.WIDTH, height / M.UI_REFERENCE.HEIGHT);
  return Phaser.Math.Clamp(s, M.MIN_UI_SCALE, 1);
}

// World text (pad costs, toasts, floating "+1") grows when the camera zooms
// out, so it stays readable on a phone. 1 on desktop.
export function worldTextScale(zoom) {
  const M = VISUALS.MOBILE;
  return Phaser.Math.Clamp(M.WORLD_TEXT_FACTOR / zoom, 1, M.MAX_WORLD_TEXT_SCALE);
}
