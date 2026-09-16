import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FallYardScene, PLATE_H, PLATE_W } from './scenes/loops/FallYardScene';

const params = new URLSearchParams(location.search);
const video = params.get('video') ?? 'fall-yard';
const speed = Number(params.get('speed') ?? '1') || 1;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: PLATE_W,
  height: PLATE_H,
  backgroundColor: '#000000',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, FallYardScene],
  callbacks: {
    preBoot(game) {
      game.registry.set('video', video);
      game.registry.set('speed', speed);
    },
  },
});
