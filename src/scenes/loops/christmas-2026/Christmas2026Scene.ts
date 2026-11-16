import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import { crossedBeat, formatTime, wrap } from '../../../systems/storyClock';
import aceUrl from '../pumpkin-patch/images/ace.png';
import { type ChristmasWho, mountChristmas2026Editor } from './christmas2026Editor';
import bedUrl from './images/bed.png';
import foregroundUrl from './images/cabin-foreground.png';
import interiorUrl from './images/cabin-interior.png';
import elf0Url from './images/elf-0.png';
import elf1Url from './images/elf-1.png';
import elf2Url from './images/elf-2.png';
import elf3Url from './images/elf-3.png';
import fireUrl from './images/fire.png';
import grinchUrl from './images/grinch.png';
import outsideUrl from './images/outside.jpg';
import rudolphUrl from './images/rudolph.png';
import sleigh1Url from './images/sleigh-1.png';
import sleigh2Url from './images/sleigh-2.png';
import trainDownUrl from './images/train-down.png';
import trainUpUrl from './images/train-up.png';
import trainUrl from './images/train.png';

/** Source plate is 1376×768. Positions below are in those pixels. */
const SRC_W = 1376;
const SRC_H = 768;

const BED = { x: 690, y: 662 };
const ACE_SCALE = 1.32;

/** Outdoor window bounds (clipped automatically by cabin-interior.png at depth 1.8). */
const OUTSIDE = { x0: 378, x1: 996, y0: 64, y1: 442, wind: 3 };
const SNOW_COUNT = 36;

/** Tree star and garland light positions in source pixels. */
const TREE_STAR = { x: 168, y: 36 };
const TREE_LIGHTS: [number, number][] = [
  [146, 118],
  [184, 134],
  [112, 174],
  [218, 168],
  [104, 244],
  [162, 268],
  [234, 286],
  [82, 316],
  [148, 344],
  [214, 366],
  [276, 386],
  [54, 412],
  [118, 434],
  [188, 442],
  [292, 452],
  [66, 488],
  [144, 506],
  [244, 496],
];

/** Distant sleigh silhouette with 2-frame galloping reindeer crossing the moon. */
const SLEIGH = { x0: 330, x1: 1040, y0: 162, y1: 138, scale: 0.24 };
const SLEIGH_MS = 16_000;

/** Full-body Rudolph walks up to the window from the right treeline, pauses, and walks back. */
const RUDOLPH = { x0: 1060, x1: 758, y: 488, scale: 0.72 };
const RUDOLPH_WALK = 2600;
const RUDOLPH_HOLD = 4500;

/** Full-body Grinch tiptoes up outside the left/center window, peers at the gifts, and sneaks off. */
const GRINCH = { x0: 310, x1: 604, y: 482, scale: 0.72 };
const GRINCH_WALK = 2400;
const GRINCH_HOLD = 4200;

/** Miniature toy steam train enters from the left, loops around Ace's bed, and exits left. */
const TRAIN = {
  xStart: -80,
  xLeft: 475,
  xRight: 918,
  yFront: 742,
  yBack: 612,
  scale: 0.48,
};

/** Four 16-bit elves hide behind the cabin-foreground.png gift/log layer (depth 3.5). */
const ELF_SCALE = 0.44;
const ELF_TEX_H = 148;
const ELF_SRC_H = ELF_TEX_H * ELF_SCALE * (PLATE_W / SRC_W) / (PLATE_H / SRC_H);
const PEEK = 36;
const SPARK_SCARE = 95;
const ELF_GAP = 2 * 60 * 1000;

const ELVES_CFG: {
  key: string;
  hide: { x: number; y: number };
  rim: number;
  points: { x: number; y: number }[];
}[] = [
  // Elf 0 (green hat): hides behind the green gift box, steps onto the front tree rug.
  {
    key: 'elf-0',
    hide: { x: 222, y: 664 },
    rim: 586,
    points: [
      { x: 164, y: 702 },
      { x: 246, y: 718 },
      { x: 326, y: 708 },
    ],
  },
  // Elf 1 (red hat): hides behind the tall gold gift box, steps out toward Ace's bed.
  {
    key: 'elf-1',
    hide: { x: 326, y: 648 },
    rim: 546,
    points: [
      { x: 408, y: 676 },
      { x: 454, y: 708 },
      { x: 386, y: 724 },
    ],
  },
  // Elf 2 (striped hat): hides behind the left red gift box, steps out onto the left rug.
  {
    key: 'elf-2',
    hide: { x: 64, y: 652 },
    rim: 560,
    points: [
      { x: 152, y: 696 },
      { x: 204, y: 722 },
      { x: 136, y: 726 },
    ],
  },
  // Elf 3 (gold-trimmed hat): hides behind the firewood logs, creeps toward the milk & cookies.
  {
    key: 'elf-3',
    hide: { x: 1306, y: 710 },
    rim: 618,
    points: [
      { x: 1148, y: 678 },
      { x: 1068, y: 706 },
      { x: 1132, y: 734 },
    ],
  },
];

type Elf = {
  sprite: Phaser.GameObjects.Image;
  points: { x: number; y: number }[];
  hide: { x: number; y: number };
  rim: number;
  step: number;
  mood: 'open' | 'bolt' | 'hide' | 'peek' | 'creep';
  wait?: Phaser.Time.TimerEvent;
};

/** Visitors on the 15-minute clock. */
const BEATS: { sec: number; who: ChristmasWho }[] = [
  { sec: 60, who: 'sleigh' },
  { sec: 210, who: 'rudolph' },
  { sec: 360, who: 'train' },
  { sec: 510, who: 'grinch' },
  { sec: 660, who: 'sleigh' },
  { sec: 780, who: 'rudolph' },
  { sec: 855, who: 'train' },
];
const BEAT_MS = BEATS.map((b) => b.sec * 1000);

export class Christmas2026Scene extends Phaser.Scene {
  private sx = 1;
  private sy = 1;
  private snow: { sprite: Phaser.GameObjects.Image; speed: number; phase: number }[] = [];
  private elves: Elf[] = [];
  private elfTurn = 0;
  private elfHolds = 0;
  private elfDue = false;
  private zzz: { g: Phaser.GameObjects.Text; t: number }[] = [];
  private snout = { x: 0, y: 0 };
  private storyMs = 0;
  private speed = 1;
  private skipBeat = false;
  private clock!: Phaser.GameObjects.Text;
  private editor?: { tick: (ms: number) => void; destroy: () => void };

  private runSleigh: () => void = () => {};
  private runRudolph: () => void = () => {};
  private runGrinch: () => void = () => {};
  private runTrain: () => void = () => {};

  constructor() {
    super('Christmas2026');
  }

  preload(): void {
    this.load.image('outside', outsideUrl);
    this.load.image('cabin-interior', interiorUrl);
    this.load.image('cabin-foreground', foregroundUrl);
    this.load.image('ace-bed', bedUrl);
    this.load.image('ace-christmas', aceUrl);
    this.load.image('xmas-fire', fireUrl);
    this.load.image('xmas-sleigh-1', sleigh1Url);
    this.load.image('xmas-sleigh-2', sleigh2Url);
    this.load.image('xmas-rudolph', rudolphUrl);
    this.load.image('xmas-grinch', grinchUrl);
    this.load.image('xmas-train', trainUrl);
    this.load.image('xmas-train-up', trainUpUrl);
    this.load.image('xmas-train-down', trainDownUrl);
    this.load.image('elf-0', elf0Url);
    this.load.image('elf-1', elf1Url);
    this.load.image('elf-2', elf2Url);
    this.load.image('elf-3', elf3Url);
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.sx = PLATE_W / SRC_W;
    this.sy = PLATE_H / SRC_H;
    const { sx, sy } = this;

    for (const key of [
      'outside',
      'cabin-interior',
      'cabin-foreground',
      'ace-bed',
      'ace-christmas',
      'xmas-fire',
      'xmas-sleigh-1',
      'xmas-sleigh-2',
      'xmas-rudolph',
      'xmas-grinch',
      'xmas-train',
      'xmas-train-up',
      'xmas-train-down',
      'elf-0',
      'elf-1',
      'elf-2',
      'elf-3',
    ]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Layer 1 (depth 0): Pure outdoor Winter Wonderland backdrop.
    this.add.image(0, 0, 'outside').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(0);

    // Layer 2 (depth 1.8): Cabin interior with transparent window panes.
    this.add.image(0, 0, 'cabin-interior').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(1.8);

    // Layer 3 (depth 3.5): Foreground presents, firewood logs, and right fireplace pillar.
    this.add.image(0, 0, 'cabin-foreground').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(3.5);

    // Layer 4 (depth 3.6): Dedicated layer for Ace's dog bed.
    this.add.image(0, 0, 'ace-bed').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(3.6);

    this.makeTextures();
    this.spawnSnow();
    this.lightTree(sx, sy);
    this.lightHearth(sx, sy);

    // Ace curled up on top of the dedicated bed.png layer (depth 3.7).
    const ace = this.add
      .image(BED.x * sx, BED.y * sy, 'ace-christmas')
      .setOrigin(0.5, 0.78)
      .setScale(ACE_SCALE)
      .setDepth(3.7);

    this.tweens.add({
      targets: ace,
      scaleY: ACE_SCALE * 1.035,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.snout = {
      x: ace.x + (0.38 - 0.5) * ace.width * ACE_SCALE,
      y: ace.y + (0 - 0.78) * ace.height * ACE_SCALE,
    };
    const zFont = Math.round((12 * PLATE_H) / 270);
    for (let i = 0; i < 3; i++) {
      const g = this.add
        .text(0, 0, 'z', {
          fontFamily: 'monospace',
          fontSize: `${zFont}px`,
          color: '#f4e8c8',
          stroke: '#3a2a18',
          strokeThickness: Math.max(1, Math.round((2 * PLATE_H) / 270)),
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.zzz.push({ g, t: i / 3 });
    }

    this.spawnElves(sx, sy);
    this.setupSleigh(sx, sy);
    this.setupRudolph(sx, sy);
    this.setupGrinch(sx, sy);
    this.setupTrain(sx, sy);

    this.clock = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: `${Math.round((8 * PLATE_H) / 270)}px`, color: '#f4e8c8' })
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    this.editor = mountChristmas2026Editor({
      beats: BEATS,
      setMs: (ms) => {
        this.skipBeat = true;
        this.storyMs = wrap(ms);
      },
      play: (who) => this.playBeat(who),
      elf: () => this.nextElf(),
      setHud: (on) => this.clock.setVisible(on),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.editor?.destroy());
  }

  private playBeat(who: ChristmasWho): void {
    if (who === 'sleigh') this.runSleigh();
    else if (who === 'rudolph') this.runRudolph();
    else if (who === 'grinch') this.runGrinch();
    else this.runTrain();
  }

  private makeTextures(): void {
    const g = this.add.graphics();
    const drawGrid = (key: string, rows: string[], palette: Record<string, number>, cell = 2) => {
      if (this.textures.exists(key)) return;
      g.clear();
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          g.fillStyle(palette[ch], 1);
          g.fillRect(x * cell, y * cell, cell, cell);
        }
      });
      g.generateTexture(key, rows[0].length * cell, rows.length * cell);
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    drawGrid('xmas-flake', ['.w.', 'www', '.w.'], { w: 0xf4f8ff }, 2);
    drawGrid('xmas-steam', ['..ww..', '.wwww.', 'wwwwww', '.wwww.', '..ww..'], { w: 0xf4f0e8 }, 2);
    g.destroy();
  }

  private spawnSnow(): void {
    for (let i = 0; i < SNOW_COUNT; i++) {
      const sprite = this.add
        .image(0, 0, 'xmas-flake')
        .setDepth(1)
        .setAlpha(0.85)
        .setScale(1.2 + (i % 3) * 0.45);
      this.snow.push({
        sprite,
        speed: 14 + (i % 5) * 3,
        phase: i * 1.7,
      });
      this.resetFlake(i, true);
    }
  }

  private resetFlake(i: number, settled: boolean): void {
    const f = this.snow[i];
    const px = OUTSIDE.x0 + Math.random() * (OUTSIDE.x1 - OUTSIDE.x0);
    const py = settled
      ? OUTSIDE.y0 + Math.random() * (OUTSIDE.y1 - OUTSIDE.y0)
      : OUTSIDE.y0 - Math.random() * 12;
    f.sprite.setPosition(px * this.sx, py * this.sy);
  }

  private lightTree(sx: number, sy: number): void {
    const starGlow = this.add
      .ellipse(TREE_STAR.x * sx, TREE_STAR.y * sy, 28 * sx, 28 * sy, 0xfff098, 0.35)
      .setDepth(2);
    this.tweens.add({
      targets: starGlow,
      alpha: 0.75,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const colors = [0xffe484, 0xff6852, 0x6ce878, 0xffe484, 0x74c8ff];
    TREE_LIGHTS.forEach(([lx, ly], i) => {
      const c = colors[i % colors.length];
      const bulb = this.add
        .ellipse(lx * sx, ly * sy, 7 * sx, 7 * sy, c, 0.35)
        .setDepth(2);
      this.tweens.add({
        targets: bulb,
        alpha: 0.95,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 720 + (i % 5) * 210,
        delay: (i * 130) % 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /** Animated fireplace using layered pixel-art flame sprites (fire.png) extracted from the scene palette. */
  private lightHearth(sx: number, sy: number): void {
    // Cover the static painted flame tips with clean firebox bricks so the animated fire.png layers own the motion.
    const brick = { x: 1158, y: 396, w: 46, h: 86 };
    for (const [dx, dy] of [
      [1204, 396],
      [1250, 396],
      [1204, 444],
      [1250, 444],
    ]) {
      this.add
        .image((dx - brick.x) * sx, (dy - brick.y) * sy, 'cabin-interior')
        .setOrigin(0, 0)
        .setDisplaySize(PLATE_W, PLATE_H)
        .setDepth(1.85)
        .setCrop(brick.x, brick.y, brick.w, brick.h);
    }

    const glow = this.add
      .ellipse(1190 * sx, 595 * sy, 260 * sx, 140 * sy, 0xff9838, 0.1)
      .setDepth(1.9);
    this.tweens.add({
      targets: glow,
      alpha: 0.26,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const fireLayers = [
      { x: 1249, y: 536, sx0: 1.04, sy0: 0.92, sy1: 1.16, flip: false, angle: 3, dur: 240, tints: [0xff9838, 0xffb848] },
      { x: 1246, y: 538, sx0: 0.96, sy0: 0.86, sy1: 1.18, flip: true, angle: -4, dur: 190, tints: [0xffd870, 0xffa038] },
      { x: 1251, y: 536, sx0: 0.88, sy0: 0.82, sy1: 1.08, flip: false, angle: 2, dur: 150, tints: [0xffffff, 0xfff0b0] },
    ];
    fireLayers.forEach((cfg, i) => {
      const f = this.add
        .image(cfg.x * sx, cfg.y * sy, 'xmas-fire')
        .setOrigin(0.5, 1)
        .setFlipX(cfg.flip)
        .setScale(sx * cfg.sx0, sy * cfg.sy0)
        .setDepth(2 + i * 0.05);
      this.tweens.add({
        targets: f,
        scaleX: sx * cfg.sx0 * 0.92,
        scaleY: sy * cfg.sy1,
        angle: cfg.angle,
        duration: cfg.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.time.addEvent({
        delay: 140 + i * 45,
        loop: true,
        callback: () => f.setTint(Phaser.Math.RND.pick(cfg.tints)),
      });
    });

    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const ember = this.add
          .rectangle(
            Phaser.Math.Between(1215, 1285) * sx,
            515 * sy,
            3 * sx,
            3 * sy,
            0xffd460,
            0.9,
          )
          .setDepth(2.15);
        this.tweens.add({
          targets: ember,
          x: ember.x + Phaser.Math.Between(-14, 14) * sx,
          y: ember.y - Phaser.Math.Between(45, 85) * sy,
          alpha: 0,
          duration: Phaser.Math.Between(900, 1500),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy(),
        });
      },
    });

    // Occasional hearth spark pops out near the cookies and startles an open elf nearby.
    this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: () => {
        const tx = Phaser.Math.Between(1110, 1175);
        const ty = Phaser.Math.Between(648, 682);
        const spark = this.add
          .rectangle(1235 * sx, 548 * sy, 3 * sx, 3 * sy, 0xffe478, 0.95)
          .setDepth(3.6);
        this.tweens.add({
          targets: spark,
          x: tx * sx,
          y: ty * sy,
          duration: 420,
          ease: 'Quad.easeOut',
          onUpdate: () => this.scareElf(spark.x / sx, spark.y / sy),
          onComplete: () => {
            this.scareElf(tx, ty);
            this.tweens.add({
              targets: spark,
              alpha: 0,
              duration: 240,
              onComplete: () => spark.destroy(),
            });
          },
        });
      },
    });
  }

  private scareElf(sxPos: number, syPos: number): void {
    for (const elf of this.elves) {
      if (elf.mood !== 'open') continue;
      const dx = elf.sprite.x / this.sx - sxPos;
      const dy = elf.sprite.y / this.sy - syPos;
      if (dx * dx + dy * dy < SPARK_SCARE * SPARK_SCARE) this.boltElf(elf);
    }
  }

  private spawnElves(sx: number, sy: number): void {
    this.elves = [];
    const scale = sx * ELF_SCALE;
    ELVES_CFG.forEach((cfg) => {
      const sprite = this.add
        .image(cfg.hide.x * sx, cfg.hide.y * sy, cfg.key)
        .setOrigin(0.5, 1)
        .setDepth(3.0)
        .setScale(scale);
      const elf: Elf = {
        sprite,
        points: cfg.points,
        hide: cfg.hide,
        rim: cfg.rim,
        step: cfg.points.length - 1,
        mood: 'hide',
      };
      this.elves.push(elf);
    });
    this.nextElf();
    this.time.addEvent({ delay: ELF_GAP, loop: true, callback: () => this.nextElf() });
  }

  private quietElves(): void {
    this.elfHolds++;
    for (const elf of this.elves) this.tuckElf(elf);
  }

  private freeElves(): void {
    if (this.elfHolds === 0) return;
    this.elfHolds--;
    if (this.elfHolds === 0 && this.elfDue) this.nextElf();
  }

  private nextElf(): void {
    if (this.elfHolds > 0) {
      this.elfDue = true;
      return;
    }
    this.elfDue = false;
    this.creepElf(this.elves[this.elfTurn++ % this.elves.length]);
  }

  private tuckElf(elf: Elf): void {
    if (elf.mood === 'hide') return;
    elf.mood = 'hide';
    elf.wait?.remove(false);
    elf.wait = undefined;
    this.tweens.killTweensOf(elf.sprite);
    const scale = this.sx * ELF_SCALE;
    elf.sprite.setScale(scale).setAngle(0);
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: elf.hide.y * this.sy,
      duration: 280,
      ease: 'Quad.easeIn',
    });
  }

  private waitElf(elf: Elf): void {
    elf.mood = 'open';
    this.tweens.add({
      targets: elf.sprite,
      x: elf.sprite.x + this.sx * 1.2,
      duration: 110,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    elf.wait = this.time.delayedCall(Phaser.Math.Between(2400, 4200), () => {
      elf.wait = undefined;
      this.boltElf(elf);
    });
  }

  private boltElf(elf: Elf): void {
    if (elf.mood !== 'open') return;
    elf.mood = 'bolt';
    elf.wait?.remove(false);
    elf.wait = undefined;
    this.tweens.killTweensOf(elf.sprite);
    const scale = this.sx * ELF_SCALE;
    elf.sprite.setScale(scale);
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: elf.hide.y * this.sy,
      duration: Phaser.Math.Between(360, 520),
      ease: 'Quad.easeIn',
      onComplete: () => this.hideElf(elf),
    });
    this.tweens.add({
      targets: elf.sprite,
      scaleY: scale * 0.86,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private hideElf(elf: Elf): void {
    elf.mood = 'hide';
    if (this.elfHolds > 0) return;
    this.time.delayedCall(Phaser.Math.Between(1400, 2400), () => {
      if (this.elfHolds > 0 || elf.mood !== 'hide') return;
      this.peekElf(elf);
    });
  }

  private peekElf(elf: Elf): void {
    elf.mood = 'peek';
    const y = (elf.rim + ELF_SRC_H - PEEK) * this.sy;
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y,
      duration: Phaser.Math.Between(280, 420),
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.elfHolds > 0) {
          this.tuckElf(elf);
          return;
        }
        this.time.delayedCall(Phaser.Math.Between(850, 1250), () => {
          if (this.elfHolds > 0) {
            this.tuckElf(elf);
            return;
          }
          this.yankElf(elf);
        });
      },
    });
  }

  private yankElf(elf: Elf): void {
    elf.mood = 'hide';
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: elf.hide.y * this.sy,
      duration: Phaser.Math.Between(140, 200),
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (elf.step === elf.points.length - 1 || this.elfHolds > 0) return;
        this.time.delayedCall(Phaser.Math.Between(400, 800), () => {
          if (this.elfHolds > 0) return;
          this.creepElf(elf);
        });
      },
    });
  }

  private creepElf(elf: Elf): void {
    if (this.elfHolds > 0) return;
    elf.mood = 'creep';
    elf.step = (elf.step + 1) % elf.points.length;
    const next = elf.points[elf.step];
    const scale = this.sx * ELF_SCALE;
    elf.sprite.setScale(scale);
    this.tweens.add({
      targets: elf.sprite,
      x: next.x * this.sx,
      y: next.y * this.sy,
      duration: Phaser.Math.Between(1100, 1700),
      ease: 'Sine.easeInOut',
      onComplete: () => this.waitElf(elf),
    });
  }

  /** Beat 1: Distant Santa sleigh with 2-frame galloping reindeer crossing the moon. */
  private setupSleigh(sx: number, sy: number): void {
    const sprite = this.add
      .image(SLEIGH.x0 * sx, SLEIGH.y0 * sy, 'xmas-sleigh-1')
      .setOrigin(0.5)
      .setScale(sx * SLEIGH.scale)
      .setDepth(1.2)
      .setVisible(false);

    let gallopTimer: Phaser.Time.TimerEvent | undefined;
    let stride = false;

    this.runSleigh = () => {
      this.tweens.killTweensOf(sprite);
      gallopTimer?.remove(false);
      stride = false;

      sprite
        .setVisible(true)
        .setTexture('xmas-sleigh-1')
        .setAlpha(0.92)
        .setPosition(SLEIGH.x0 * sx, SLEIGH.y0 * sy)
        .setAngle(-2);

      gallopTimer = this.time.addEvent({
        delay: 190,
        loop: true,
        callback: () => {
          stride = !stride;
          sprite.setTexture(stride ? 'xmas-sleigh-2' : 'xmas-sleigh-1');
        },
      });

      this.tweens.add({
        targets: sprite,
        x: SLEIGH.x1 * sx,
        y: SLEIGH.y1 * sy,
        duration: SLEIGH_MS,
        ease: 'Linear',
        onComplete: () => {
          gallopTimer?.remove(false);
          gallopTimer = undefined;
          this.tweens.killTweensOf(sprite);
          sprite.setVisible(false);
        },
      });
      this.tweens.add({
        targets: sprite,
        angle: 2,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };
  }

  /** Beat 2: Full-body Rudolph walks in from the right treeline up to the center window. */
  private setupRudolph(sx: number, sy: number): void {
    const body = this.add
      .image(RUDOLPH.x0 * sx, RUDOLPH.y * sy, 'xmas-rudolph')
      .setOrigin(0.5, 1)
      .setScale(sx * RUDOLPH.scale)
      .setDepth(1.5)
      .setVisible(false);

    const noseGlow = this.add
      .ellipse((RUDOLPH.x1 - 45) * sx, (RUDOLPH.y - 102) * sy, 20 * sx, 20 * sy, 0xff2a2a, 0)
      .setDepth(1.6)
      .setVisible(false);

    this.runRudolph = () => {
      this.tweens.killTweensOf(body);
      this.tweens.killTweensOf(noseGlow);
      noseGlow.setVisible(false).setAlpha(0);

      body
        .setVisible(true)
        .setFlipX(false)
        .setAngle(-1.5)
        .setPosition(RUDOLPH.x0 * sx, RUDOLPH.y * sy);

      // Walking bob while trotting up to the window.
      const stepBob = this.tweens.add({
        targets: body,
        y: (RUDOLPH.y - 5) * sy,
        angle: 1.5,
        duration: 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: body,
        x: RUDOLPH.x1 * sx,
        duration: RUDOLPH_WALK,
        ease: 'Sine.easeOut',
        onComplete: () => {
          stepBob.stop();
          body.setY(RUDOLPH.y * sy).setAngle(0);
          noseGlow.setVisible(true).setAlpha(0.5);
          this.tweens.add({
            targets: noseGlow,
            alpha: 0.9,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          this.time.delayedCall(RUDOLPH_HOLD, () => {
            this.tweens.killTweensOf(noseGlow);
            noseGlow.setVisible(false);
            body.setFlipX(true);
            this.tweens.add({
              targets: body,
              y: (RUDOLPH.y - 5) * sy,
              angle: -1.5,
              duration: 240,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
            this.tweens.add({
              targets: body,
              x: RUDOLPH.x0 * sx,
              duration: RUDOLPH_WALK,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this.tweens.killTweensOf(body);
                body.setVisible(false);
              },
            });
          });
        },
      });
    };
  }

  /** Beat 3: Full-body Grinch tiptoes up outside the window, scattering the elves. */
  private setupGrinch(sx: number, sy: number): void {
    const body = this.add
      .image(GRINCH.x0 * sx, GRINCH.y * sy, 'xmas-grinch')
      .setOrigin(0.5, 1)
      .setScale(sx * GRINCH.scale)
      .setDepth(1.5)
      .setVisible(false);

    this.runGrinch = () => {
      this.quietElves();
      this.tweens.killTweensOf(body);
      body
        .setVisible(true)
        .setFlipX(true)
        .setAngle(-3)
        .setPosition(GRINCH.x0 * sx, GRINCH.y * sy);

      const tiptoe = this.tweens.add({
        targets: body,
        y: (GRINCH.y - 6) * sy,
        angle: 3,
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: body,
        x: GRINCH.x1 * sx,
        duration: GRINCH_WALK,
        ease: 'Sine.easeOut',
        onComplete: () => {
          tiptoe.stop();
          body.setY(GRINCH.y * sy).setAngle(0);
          this.tweens.add({
            targets: body,
            angle: 4,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          this.time.delayedCall(GRINCH_HOLD, () => {
            this.tweens.killTweensOf(body);
            body.setFlipX(false);
            this.tweens.add({
              targets: body,
              y: (GRINCH.y - 6) * sy,
              angle: -3,
              duration: 280,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
            this.tweens.add({
              targets: body,
              x: GRINCH.x0 * sx,
              duration: GRINCH_WALK,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this.tweens.killTweensOf(body);
                body.setVisible(false);
                this.freeElves();
              },
            });
          });
        },
      });
    };
  }

  /** Beat 4: Miniature steam locomotive enters from the left, loops around Ace's bed, and exits left. */
  private setupTrain(sx: number, sy: number): void {
    const train = this.add
      .image(TRAIN.xStart * sx, TRAIN.yFront * sy, 'xmas-train')
      .setOrigin(0.5, 1)
      .setScale(sx * TRAIN.scale)
      .setDepth(4.2)
      .setVisible(false);

    let steamTimer: Phaser.Time.TimerEvent | undefined;

    this.runTrain = () => {
      this.quietElves();
      this.tweens.killTweensOf(train);
      steamTimer?.remove(false);

      train
        .setVisible(true)
        .setTexture('xmas-train')
        .setFlipX(false)
        .setDepth(4.2)
        .setPosition(TRAIN.xStart * sx, TRAIN.yFront * sy);

      this.tweens.add({
        targets: train,
        scaleY: sx * TRAIN.scale * 1.05,
        duration: 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      steamTimer = this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          if (!train.visible) return;
          const isSide = train.texture.key === 'xmas-train';
          const dir = isSide ? (train.flipX ? -1 : 1) : 0;
          const puff = this.add
            .image(train.x + dir * 14 * sx, train.y - 48 * sy, 'xmas-steam')
            .setAlpha(0.85)
            .setScale(sx * 0.75)
            .setDepth(train.depth + 0.05);
          this.tweens.add({
            targets: puff,
            x: puff.x + (dir ? -dir * Phaser.Math.Between(10, 22) : Phaser.Math.Between(-8, 8)) * sx,
            y: puff.y - Phaser.Math.Between(24, 44) * sy,
            scale: sx * 1.7,
            alpha: 0,
            duration: Phaser.Math.Between(850, 1300),
            ease: 'Sine.easeOut',
            onComplete: () => puff.destroy(),
          });
        },
      });

      // Leg 1: Enter from left and chug across the front floorboards past Ace's bed (depth 4.2).
      this.tweens.add({
        targets: train,
        x: TRAIN.xRight * sx,
        duration: 6200,
        ease: 'Linear',
        onComplete: () => {
          // Leg 2: Rear view ('xmas-train-up') while chugging up the right side of Ace's bed.
          train.setTexture('xmas-train-up').setFlipX(false);
          this.tweens.add({
            targets: train,
            y: TRAIN.yBack * sy,
            duration: 1300,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              // Leg 3: Side view flipped left ('xmas-train') chugging BEHIND Ace's dog bed (depth 3.2 < bed 3.6).
              train.setTexture('xmas-train').setFlipX(true).setDepth(3.2);
              this.tweens.add({
                targets: train,
                x: TRAIN.xLeft * sx,
                duration: 3200,
                ease: 'Linear',
                onComplete: () => {
                  // Leg 4: Front view ('xmas-train-down') chugging down the left side of Ace's bed (depth 4.2).
                  train.setTexture('xmas-train-down').setFlipX(false).setDepth(4.2);
                  this.tweens.add({
                    targets: train,
                    y: TRAIN.yFront * sy,
                    duration: 1300,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                      // Leg 5: Side view flipped left ('xmas-train') chugging back out to the left.
                      train.setTexture('xmas-train').setFlipX(true);
                      this.tweens.add({
                        targets: train,
                        x: TRAIN.xStart * sx,
                        duration: 3800,
                        ease: 'Linear',
                        onComplete: () => {
                          steamTimer?.remove(false);
                          steamTimer = undefined;
                          this.tweens.killTweensOf(train);
                          train.setVisible(false);
                          this.freeElves();
                        },
                      });
                    },
                  });
                },
              });
            },
          });
        },
      });
    };
  }

  update(_t: number, delta: number): void {
    const prev = this.storyMs;
    this.storyMs = wrap(this.storyMs + delta * this.speed);
    if (this.skipBeat) this.skipBeat = false;
    else {
      const hit = crossedBeat(prev, this.storyMs, BEAT_MS);
      if (hit >= 0) this.playBeat(BEATS[hit].who);
    }

    const vis = delta / 1000;
    const driftX = (5 * PLATE_W) / 480;
    const rise = (20 * PLATE_H) / 270;
    for (const z of this.zzz) {
      z.t = (z.t + vis * 0.16) % 1;
      const t = z.t;
      z.g.setPosition(this.snout.x + Math.sin(t * Math.PI * 2) * driftX, this.snout.y - t * rise);
      z.g.setAlpha(t < 0.1 ? t / 0.1 : 0.95 * (1 - (t - 0.1) / 0.9));
      z.g.setScale(0.85 + t * 0.45);
    }

    for (let i = 0; i < this.snow.length; i++) {
      const f = this.snow[i];
      const wobble = Math.sin((f.sprite.y / this.sy) * 0.09 + f.phase) * 5;
      f.sprite.x += vis * this.sx * (OUTSIDE.wind + wobble);
      f.sprite.y += vis * this.sy * f.speed;
      if (f.sprite.y / this.sy >= OUTSIDE.y1 || f.sprite.x / this.sx > OUTSIDE.x1) {
        this.resetFlake(i, false);
      }
    }

    this.clock.setText(`christmas-2026 ${formatTime(this.storyMs)} x${this.speed}`);
    this.editor?.tick(this.storyMs);
  }
}
