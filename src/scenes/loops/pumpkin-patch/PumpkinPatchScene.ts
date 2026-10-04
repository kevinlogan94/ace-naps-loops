import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';

export class PumpkinPatchScene extends Phaser.Scene {
  constructor() {
    super('PumpkinPatch');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2a1810');
    this.add
      .text(PLATE_W / 2, PLATE_H / 2, 'Pumpkin patch', {
        fontFamily: 'monospace',
        fontSize: '96px',
        color: '#f4e8c8',
      })
      .setOrigin(0.5);
  }
}
