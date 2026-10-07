import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import aceUrl from './ace.png';
import patchUrl from './pumpkin-patch.jpg';

/** Source plate is 1024×571. Leaf bed center, in those pixels. */
const SRC_W = 1024;
const SRC_H = 571;
const BED = { x: 520, y: 412 };
const ACE_SCALE = 0.8;

export class PumpkinPatchScene extends Phaser.Scene {
  constructor() {
    super('PumpkinPatch');
  }

  preload(): void {
    this.load.image('patch', patchUrl);
    this.load.image('ace', aceUrl);
  }

  create(): void {
    const sx = PLATE_W / SRC_W;
    const sy = PLATE_H / SRC_H;
    this.textures.get('patch').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('ace').setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.add.image(0, 0, 'patch').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H);

    const ace = this.add
      .image(BED.x * sx, BED.y * sy, 'ace')
      .setOrigin(0.5, 0.78)
      .setScale(ACE_SCALE)
      .setDepth(1);

    this.tweens.add({
      targets: ace,
      scaleY: ACE_SCALE * 1.035,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
