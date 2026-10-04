import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from './plate';
import { loopForPath } from './scenes/loops';

const { slug, scene } = loopForPath(location.pathname);
const speed = Number(new URLSearchParams(location.search).get('speed') ?? '1') || 1;

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
  scene: [scene],
  callbacks: {
    preBoot(game) {
      game.registry.set('video', slug);
      game.registry.set('speed', speed);
    },
  },
});
