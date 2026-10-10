import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import leavesUrl from '../fall-yard/leaves.png';
import aceUrl from './ace.png';
import patchUrl from './pumpkin-patch.jpg';

/** Source plate is 1024×571. Positions below are in those pixels. */
const SRC_W = 1024;
const SRC_H = 571;
const BED = { x: 520, y: 412 };
const CHIMNEY = { x: 675, y: 47 };
/** Mouth of the cauldron. The rim is painted into the plate, so the brew stays inside it. */
const POT = { x: 628, y: 320 };
/** Flame bases, in the glow under the belly and between the feet. */
const FIRES = [
  { x: 614, y: 360 },
  { x: 628, y: 364 },
  { x: 642, y: 360 },
];
const ACE_SCALE = 0.8;
/** Back-yard leaves vanish at the top rail. They never cross into the foreground. */
const FENCE_Y = 250;

/** Two thirds of the first pebble. Small beside the pumpkins. */
const SOOT_SCALE = 3/4;

/** Grass gaps in source pixels, below the fence. */
const SOOTS: { x: number; y: number }[][] = [
  [
    { x: 330, y: 445 },
    { x: 320, y: 515 },
    { x: 410, y: 515 },
  ],
  [
    { x: 650, y: 530 },
    { x: 530, y: 548 },
    { x: 670, y: 548 },
  ],
  [
    { x: 860, y: 410 },
    { x: 810, y: 430 },
    { x: 870, y: 450 },
  ],
  [
    { x: 430, y: 330 },
    { x: 500, y: 340 },
    { x: 440, y: 370 },
  ],
];

type Crown = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  scale: number;
  depth: number;
  stopY: number;
  wind: number;
  /** Source pixels of fade before stopY. */
  fade: number;
};

/** Crowns in source pixels. Boxes sit in the wide part of each crown, not the narrow top. */
const TREES: Crown[] = [
  { x0: 4, x1: 72, y0: 118, y1: 165, scale: 2, depth: 1, stopY: FENCE_Y, wind: 2, fade: 28 },
  { x0: 96, x1: 176, y0: 138, y1: 175, scale: 2, depth: 1, stopY: FENCE_Y, wind: 2, fade: 28 },
  { x0: 210, x1: 280, y0: 150, y1: 185, scale: 2, depth: 1, stopY: FENCE_Y, wind: 2, fade: 28 },
  { x0: 300, x1: 378, y0: 155, y1: 190, scale: 2, depth: 1, stopY: FENCE_Y, wind: 2, fade: 28 },
  // Pot bottom is about y 340. Full through it, gone just past it.
  { x0: 564, x1: 660, y0: 148, y1: 195, scale: 3, depth: 4, stopY: 372, wind: 10, fade: 32 },
  { x0: 952, x1: 1016, y0: 125, y1: 190, scale: 3, depth: 4, stopY: SRC_H + 40, wind: 10, fade: 28 },
];

/** Four leaves on each back tree, two on the tree left of the cottage, five on the right. */
const LEAF_TREES = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 5];

export class PumpkinPatchScene extends Phaser.Scene {
  private sx = 1;
  private sy = 1;
  private leaves: { sprite: Phaser.GameObjects.Sprite; tree: number }[] = [];

  constructor() {
    super('PumpkinPatch');
  }

  preload(): void {
    this.load.image('patch', patchUrl);
    this.load.image('ace', aceUrl);
    this.load.spritesheet('leaves', leavesUrl, { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    this.sx = PLATE_W / SRC_W;
    this.sy = PLATE_H / SRC_H;
    const { sx, sy } = this;
    this.textures.get('patch').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('ace').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('leaves').setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.add.image(0, 0, 'patch').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(0);

    for (let i = 0; i < LEAF_TREES.length; i++) {
      const tree = LEAF_TREES[i];
      const crown = TREES[tree];
      const leaf = this.add.sprite(0, 0, 'leaves', i % 4).setDepth(crown.depth).setScale(crown.scale);
      this.leaves.push({ sprite: leaf, tree });
      this.dropLeaf(i, true);
    }

    const ace = this.add
      .image(BED.x * sx, BED.y * sy, 'ace')
      .setOrigin(0.5, 0.78)
      .setScale(ACE_SCALE)
      .setDepth(2);

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

    this.makeCookTextures();
    this.cook(sx, sy);
    this.spawnSoot(sx, sy);
  }

  /** Green brew in the mouth, bubbles that pop, and a short fire under the pot. */
  private cook(sx: number, sy: number): void {
    const brew = this.add.image(POT.x * sx, POT.y * sy, 'brew').setDepth(1).setScale(sx);
    this.tweens.add({
      targets: brew,
      scaleY: sx * 0.75,
      y: brew.y + sy,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const bubble = () => this.emitBubble(POT.x * sx, POT.y * sy, sx);
    bubble();
    this.time.addEvent({ delay: 340, loop: true, callback: bubble });

    FIRES.forEach((fire, i) => {
      const scale = sx * (0.4 + (i % 2) * 0.25);
      const flame = this.add
        .image(fire.x * sx, fire.y * sy, 'flame')
        .setOrigin(0.5, 1)
        .setDepth(1)
        .setScale(scale);
      this.tweens.add({
        targets: flame,
        scaleX: scale * 0.9,
        scaleY: scale * 1.35,
        duration: 180 + i * 70,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.time.addEvent({
        delay: 140 + i * 40,
        loop: true,
        callback: () => flame.setTint(Phaser.Math.RND.pick([0xffffff, 0xfff0b0, 0xffb060])),
      });
    });
  }

  private emitBubble(x: number, y: number, sx: number): void {
    const bubble = this.add
      .image(x + Phaser.Math.Between(-8, 8) * sx, y, 'bubble')
      .setDepth(1)
      .setScale(sx * 0.55)
      .setAlpha(0.95);
    this.tweens.add({
      targets: bubble,
      y: bubble.y - Phaser.Math.Between(8, 16) * sx,
      duration: Phaser.Math.Between(380, 640),
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: bubble,
          scale: sx * 1.8,
          alpha: 0,
          duration: 140,
          onComplete: () => bubble.destroy(),
        });
      },
    });
  }

  /** Chunky brew, bubble, and flame. Nearest filtering keeps them pixelated. */
  private makeCookTextures(): void {
    if (this.textures.exists('brew')) return;
    const g = this.add.graphics();
    const brewW = 28;
    const brewH = 8;
    for (let y = 0; y < brewH; y += 2) {
      for (let x = 0; x < brewW; x += 2) {
        const nx = ((x + 1) / brewW) * 2 - 1;
        const ny = ((y + 1) / brewH) * 2 - 1;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        g.fillStyle(d > 0.62 ? 0x1c6e20 : y < 4 ? 0x92e25a : 0x3cb43a);
        g.fillRect(x, y, 2, 2);
      }
    }
    g.generateTexture('brew', brewW, brewH);
    g.clear();

    g.fillStyle(0xd8ffb0);
    for (const [x, y] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ]) {
      g.fillRect(x * 2, y * 2, 2, 2);
    }
    g.fillStyle(0xffffff);
    g.fillRect(2, 2, 2, 2);
    g.generateTexture('bubble', 6, 6);
    g.clear();

    const cells = ['  y  ', ' yyy ', ' yoy ', 'yoooy', 'yoooy', 'rooor', 'rooor', ' rrr '];
    const color: Record<string, number> = { y: 0xffe14a, o: 0xff7a1a, r: 0xe23b12 };
    cells.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const fill = color[row[x]];
        if (!fill) continue;
        g.fillStyle(fill);
        g.fillRect(x * 2, y * 2, 2, 2);
      }
    });
    g.generateTexture('flame', 10, 16);
    g.destroy();
    for (const key of ['brew', 'bubble', 'flame']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
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

  private spawnSoot(sx: number, sy: number): void {
    if (!this.textures.exists('soot')) {
      const g = this.add.graphics();
      const cell = 2;
      const rows = ['  ###  ', ' ##### ', '#######', '##w#w##', '#######', ' ##### ', '  ###  '];
      const draw = (key: string, eyes: boolean) => {
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (row[x] === ' ') continue;
            g.fillStyle(eyes && row[x] === 'w' ? 0xffffff : 0x2a2826);
            g.fillRect(x * cell, y * cell, cell, cell);
          }
        });
        g.generateTexture(key, rows[0].length * cell, rows.length * cell);
        g.clear();
      };
      draw('soot', true);
      draw('soot-shut', false);
      g.destroy();
      for (const key of ['soot', 'soot-shut']) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    const scale = sx * SOOT_SCALE;
    SOOTS.forEach((points, i) => {
      const home = points[0];
      const soot = this.add
        .image(home.x * sx, home.y * sy, 'soot')
        .setOrigin(0.5, 1)
        .setDepth(1 + home.y / SRC_H)
        .setScale(scale);
      this.time.delayedCall(i * 220, () => this.hopSoot(soot, points, 1, sx, sy));
      this.time.delayedCall(i * 500, () => this.blinkSoot(soot));
    });
  }

  private blinkSoot(soot: Phaser.GameObjects.Image): void {
    this.time.delayedCall(Phaser.Math.Between(1800, 4200), () => {
      soot.setTexture('soot-shut');
      this.time.delayedCall(140, () => {
        soot.setTexture('soot');
        this.blinkSoot(soot);
      });
    });
  }

  private hopSoot(
    soot: Phaser.GameObjects.Image,
    points: { x: number; y: number }[],
    step: number,
    sx: number,
    sy: number,
  ): void {
    const next = points[step % points.length];
    const scale = sx * SOOT_SCALE;
    this.time.delayedCall(Phaser.Math.Between(1200, 2400), () => {
      soot.setScale(scale).setDepth(1 + next.y / SRC_H);
      this.tweens.add({
        targets: soot,
        x: next.x * sx,
        y: next.y * sy,
        duration: Phaser.Math.Between(1100, 1700),
        ease: 'Sine.easeInOut',
        onComplete: () => this.hopSoot(soot, points, step + 1, sx, sy),
      });
      this.tweens.add({
        targets: soot,
        scaleY: scale * 0.86,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    });
  }

  private emitSmoke(x: number, y: number, sx: number): void {
    const puff = this.add
      .image(x + Phaser.Math.Between(-4, 4) * sx, y, 'smoke-puff')
      .setTint(Phaser.Math.RND.pick([0xcfc9bf, 0xb0aaa0, 0x8a847c]))
      .setAlpha(0.9)
      .setScale(sx * 0.9)
      .setDepth(3);
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

  update(_t: number, delta: number): void {
    const vis = delta / 1000;
    for (let i = 0; i < this.leaves.length; i++) {
      const { sprite: leaf, tree } = this.leaves[i];
      const crown = TREES[tree];
      const wobble = Math.sin((leaf.y / this.sy + i * 13) * 0.08) * 4;
      leaf.x += vis * this.sx * (crown.wind + wobble);
      leaf.y += vis * this.sy * 20;
      leaf.angle += vis * (40 + (i % 5) * 12);
      const srcY = leaf.y / this.sy;
      if (crown.stopY < SRC_H) {
        leaf.setAlpha(Math.max(0, Math.min(1, (crown.stopY - srcY) / crown.fade)));
      }
      if (srcY >= crown.stopY || leaf.x > PLATE_W + 40) this.dropLeaf(i, false);
    }
  }

  /** settled places a leaf already on its way down, still in that tree's column. */
  private dropLeaf(i: number, settled: boolean): void {
    const { sprite: leaf, tree } = this.leaves[i];
    const crown = TREES[tree];
    let px = crown.x0 + Math.random() * (crown.x1 - crown.x0);
    let py = crown.y0 + Math.random() * (crown.y1 - crown.y0);
    if (settled) {
      const room = Math.max(0, Math.min(crown.stopY, SRC_H - 8) - py);
      const dy = Math.random() * room;
      const dx = (dy / 20) * crown.wind;
      if (px + dx < SRC_W - 8) {
        px += dx;
        py += dy;
      }
    }
    leaf.setPosition(px * this.sx, py * this.sy).setAngle(Math.random() * 360).setAlpha(1).setScale(crown.scale);
  }
}
