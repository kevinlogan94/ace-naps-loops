import Phaser from 'phaser';

const C = 'assets/custom';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('yard', `${C}/fall-yard.jpg`);
    this.load.image('yard-tree', `${C}/tree-fall.png`);
    this.load.spritesheet('crow', `${C}/crow-sheet.png`, { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('leaves', `${C}/leaves.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.image('witch', `${C}/witch.png`);
  }

  create(): void {
    this.scene.start('FallYard');
  }
}
