import Phaser from 'phaser';

const C = 'assets/custom';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('yard', `${C}/fall-yard.jpg`);
    this.load.image('crow', `${C}/crow.png`);
    this.load.spritesheet('leaves', `${C}/leaves.png`, { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    this.scene.start('FallYard');
  }
}
