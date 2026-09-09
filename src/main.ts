import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FallYardScene } from './scenes/loops/FallYardScene';

const params = new URLSearchParams(location.search);
const video = params.get('video') ?? 'fall-yard';
const speed = Number(params.get('speed') ?? '1') || 1;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 270,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    snap: { width: 480, height: 270 },
  },
  scene: [BootScene, FallYardScene],
  callbacks: {
    preBoot(game) {
      game.registry.set('video', video);
      game.registry.set('speed', speed);
    },
  },
});
