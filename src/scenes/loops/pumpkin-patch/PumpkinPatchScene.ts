import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import aceUrl from './ace.png';
import patchUrl from './pumpkin-patch.jpg';

/** Source plate is 1024×571. Positions below are in those pixels. */
const SRC_W = 1024;
const SRC_H = 571;
const BED = { x: 520, y: 412 };
const CHIMNEY = { x: 675, y: 47 };
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

    this.makeSmokePuff();
    const puff = () => this.emitSmoke(CHIMNEY.x * sx, CHIMNEY.y * sy, sx);
    puff();
    this.time.addEvent({ delay: 500, loop: true, callback: puff });
  }

  /** One chunky gray puff. Scaled up with nearest filtering so it stays pixelated. */
  private makeSmokePuff(): void {
    if (this.textures.exists('smoke-puff')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff);
    for (const [x, y] of [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 3],
      [2, 3],
    ]) {
      g.fillRect(x * 4, y * 4, 4, 4);
    }
    g.generateTexture('smoke-puff', 16, 16);
    g.destroy();
    this.textures.get('smoke-puff').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  private emitSmoke(x: number, y: number, sx: number): void {
    const puff = this.add
      .image(x + Phaser.Math.Between(-4, 4) * sx, y, 'smoke-puff')
      .setTint(Phaser.Math.RND.pick([0xcfc9bf, 0xb0aaa0, 0x8a847c]))
      .setAlpha(0.9)
      .setScale(sx * 0.9)
      .setDepth(2);
    this.tweens.add({
      targets: puff,
      x: puff.x + Phaser.Math.Between(-18, 36) * sx,
      y: puff.y - Phaser.Math.Between(90, 140) * sx,
      scale: sx * Phaser.Math.FloatBetween(2.2, 3.2),
      alpha: 0,
      duration: Phaser.Math.Between(7000, 10000),
      ease: 'Sine.easeOut',
      onComplete: () => puff.destroy(),
    });
  }
}
