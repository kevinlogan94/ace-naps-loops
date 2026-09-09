import Phaser from 'phaser';

const U = 'assets/lpc/use';
const C = 'assets/custom';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.spritesheet('terrain', `${U}/terrain.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('trees', `${C}/trees.png`, { frameWidth: 128, frameHeight: 144 });
    this.load.spritesheet('plants', `${U}/plants.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('ripple', `${U}/ripple.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.image('house', `${U}/house.png`);
    this.load.spritesheet('lantern', `${U}/lantern.png`, { frameWidth: 32, frameHeight: 96 });
    this.load.spritesheet('wildflowers', `${U}/wildflowers.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('ace', `${C}/ace-nap.png`, { frameWidth: 44, frameHeight: 38 });
    this.load.image('crow', `${C}/crow.png`);
    this.load.spritesheet('hunt', `${C}/hunt.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('leaves', `${C}/leaves.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('kevin-walk', `${C}/kevin-walk.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('kevin-sit', `${C}/kevin-sit.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('witch-walk', `${C}/witch-walk.png`, { frameWidth: 64, frameHeight: 64 });
  }

  create(): void {
    this.anims.create({
      key: 'ripple',
      frames: this.anims.generateFrameNumbers('ripple', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'ace-nap',
      frames: this.anims.generateFrameNumbers('ace', { start: 0, end: 3 }),
      frameRate: 2,
      repeat: -1,
    });
    this.scene.start('FallYard');
  }
}
