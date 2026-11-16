import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import { crossedBeat, formatTime, wrap } from '../../../systems/storyClock';
import { type ChristmasWho, mountChristmas2026Editor } from './christmas2026Editor';
import aceUrl from '../pumpkin-patch/images/ace.png';
import interiorUrl from './images/cabin-interior.png';
import outsideUrl from './images/outside.jpg';
import rudolphUrl from './images/rudolph.png';
import sleighUrl from './images/sleigh-silhouette.png';

/** Source plate is 1376×768. Positions below are in those pixels. */
const SRC_W = 1376;
const SRC_H = 768;

const BED = { x: 690, y: 662 };
const ACE_SCALE = 1.32;

/** Outdoor window bounds (clipped automatically by cabin-interior.png at depth 1.8). */
const OUTSIDE = { x0: 378, x1: 996, y0: 64, y1: 442, wind: 3 };
const SNOW_COUNT = 36;

/** Fireplace flame bases along the diagonal log grate. */
const FIRES = [
  { x: 1212, y: 518, s: 2.8 },
  { x: 1228, y: 524, s: 3.9 },
  { x: 1244, y: 530, s: 4.7 },
  { x: 1262, y: 536, s: 5.3 },
  { x: 1276, y: 542, s: 4.4 },
  { x: 1288, y: 548, s: 3.5 },
  { x: 1220, y: 526, s: 2.5 },
  { x: 1252, y: 538, s: 3.2 },
  { x: 1280, y: 550, s: 2.7 },
] as const;

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

/** Santa's sleigh glides behind the bay window frames and across the full moon. */
const SLEIGH = { x0: 280, x1: 1088, y0: 156, y1: 142, scale: 0.52 };
const SLEIGH_MS = 18_000;

/** Rudolph peeks over the right side of the center windowsill. */
const RUDOLPH = { x: 756, hideY: 572, showY: 430, scale: 0.58 };
const RUDOLPH_HOLD = 6500;

/** The Grinch sneaks up at the left side of the center windowsill to eye the tree & gifts. */
const GRINCH = { x0: 584, x1: 616, hideY: 506, showY: 432, scale: 2.35 };
const GRINCH_HOLD = 6200;

/** Miniature toy steam train chugs across the open foreground floorboards. */
const TRAIN = { x0: -90, x1: SRC_W + 90, y: 748, scale: 2.4 };
const TRAIN_MS = 15_000;

/** Four elves take turns every 2 minutes, matching the soot rhythm in pumpkin-patch. */
const ELF_SCALE = 1.65;
const ELF_TEX_H = 30;
const ELF_SRC_H = ELF_TEX_H * ELF_SCALE * (PLATE_W / SRC_W) / (PLATE_H / SRC_H);
/** Clears the pointed hat and blinking eyes above the prop rim while keeping the tunic hidden. */
const PEEK = 33;
const SPARK_SCARE = 95;
const ELF_GAP = 2 * 60 * 1000;

const ELVES_POINTS: { x: number; y: number }[][] = [
  // Elf 0 (green hat): steps out from the side of the green gift onto the red tree rug.
  [
    { x: 292, y: 684 },
    { x: 234, y: 712 },
    { x: 346, y: 718 },
  ],
  // Elf 1 (red hat): steps out from the right of the gold gift toward Ace's bed.
  [
    { x: 412, y: 654 },
    { x: 454, y: 696 },
    { x: 392, y: 724 },
  ],
  // Elf 2 (striped hat): floorboards just behind/left of Ace's bed.
  [
    { x: 462, y: 616 },
    { x: 486, y: 646 },
    { x: 448, y: 660 },
  ],
  // Elf 3 (gold-bell hat): creeps from the log pile toward the milk & cookies plate.
  [
    { x: 1126, y: 662 },
    { x: 1048, y: 696 },
    { x: 1106, y: 732 },
  ],
];

/** Rectangular foreground prop crops that the 4 elves hide behind and peek over. */
const COVERS: {
  crop: { x: number; y: number; w: number; h: number };
  hide: { x: number; y: number };
}[] = [
  // Green wrapped gift box under the tree.
  { crop: { x: 172, y: 590, w: 102, h: 84 }, hide: { x: 222, y: 656 } },
  // Tall gold wrapped gift box.
  { crop: { x: 272, y: 552, w: 112, h: 114 }, hide: { x: 330, y: 626 } },
  // Red wrapped gift box to the right of the gold box.
  { crop: { x: 376, y: 536, w: 70, h: 92 }, hide: { x: 412, y: 606 } },
  // Stack of firewood logs in the bottom-right foreground.
  { crop: { x: 1218, y: 622, w: 158, h: 146 }, hide: { x: 1296, y: 704 } },
];

type Elf = {
  sprite: Phaser.GameObjects.Image;
  openKey: string;
  shutKey: string;
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
    this.load.image('ace-christmas', aceUrl);
    this.load.image('xmas-sleigh', sleighUrl);
    this.load.image('xmas-rudolph', rudolphUrl);
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.sx = PLATE_W / SRC_W;
    this.sy = PLATE_H / SRC_H;
    const { sx, sy } = this;

    for (const key of ['outside', 'cabin-interior', 'ace-christmas', 'xmas-sleigh', 'xmas-rudolph']) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Layer 1 (depth 0): Pure outdoor Winter Wonderland backdrop.
    this.add.image(0, 0, 'outside').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(0);

    // Layer 2 (depth 1.8): Cabin interior with transparent window panes (masks everything between depth 0 and 1.8).
    this.add.image(0, 0, 'cabin-interior').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(1.8);

    this.makeTextures();
    this.spawnSnow();
    this.lightTree(sx, sy);
    this.lightHearth(sx, sy);

    // Ace curled up in the plush plaid bed.
    const ace = this.add
      .image(BED.x * sx, BED.y * sy, 'ace-christmas')
      .setOrigin(0.5, 0.78)
      .setScale(ACE_SCALE)
      .setDepth(2.5);

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

  /** Procedural pixel-art textures with nearest-neighbor filtering. */
  private makeTextures(): void {
    const g = this.add.graphics();
    const drawGrid = (key: string, rows: string[], palette: Record<string, number>, cell = 2) => {
      if (this.textures.exists(key)) return;
      g.clear();
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === ' ' || ch === '.') continue;
          const color = palette[ch];
          if (color === undefined) continue;
          g.fillStyle(color, 1);
          g.fillRect(x * cell, y * cell, cell, cell);
        }
      });
      g.generateTexture(key, rows[0].length * cell, rows.length * cell);
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    // Crisp pixel snowflake and steam puff.
    drawGrid('xmas-flake', ['.w.', 'www', '.w.'], { w: 0xf4f8ff }, 2);
    drawGrid(
      'xmas-steam',
      ['..ww..', '.wwww.', 'wwwwww', '.wwww.', '..ww..'],
      { w: 0xf4f0e8 },
      2,
    );

    // Hearth flame.
    drawGrid(
      'xmas-flame',
      ['..y..', '.yyy.', '.yoy.', 'yoooy', 'yoooy', 'rooor', 'rooor', '.rrr.'],
      { y: 0xffe664, o: 0xff8420, r: 0xe03c14 },
      2,
    );

    // Four distinct elves (open eyes and shut eyes for blinking).
    const elfVariants = [
      { hat: 0x247a38, s: 0x247a38, trim: 0xf6f0e4, suit: 0xc83228 },
      { hat: 0xc83228, s: 0xc83228, trim: 0xf6f0e4, suit: 0x247a38 },
      { hat: 0xc83228, s: 0xf6f0e4, trim: 0xf6f0e4, suit: 0x2f5a8c },
      { hat: 0x247a38, s: 0x247a38, trim: 0xf6d048, suit: 0x8a3822 },
    ];
    const elfOpen = [
      '....tt....',
      '...hhhh...',
      '..hhhhhh..',
      '..ssssss..',
      '.hhhhhhhh.',
      '.tttttttt.',
      '.kffffffk.',
      'kfwwffwwfk',
      'kfbwffwbfk',
      '.kpffffpk.',
      '..ffffff..',
      '..tttttt..',
      '.cccccccc.',
      '.ccctcccc.',
      '..cccccc..',
    ];
    const elfShut = elfOpen.map((r, y) => (y === 7 ? 'kffffffffk' : y === 8 ? 'kfbbffbbfk' : r));
    elfVariants.forEach((v, i) => {
      const pal = { h: v.hat, s: v.s, t: v.trim, c: v.suit, f: 0xf4c49c, k: 0xf4c49c, p: 0xe89088, w: 0xffffff, b: 0x201814 };
      drawGrid(`elf-${i}`, elfOpen, pal, 2);
      drawGrid(`elf-${i}-shut`, elfShut, pal, 2);
    });

    // Single still frame for the Grinch in a Santa hat.
    drawGrid(
      'xmas-grinch',
      [
        '....rrrrr...',
        '...rrrrrrr..',
        '..rrrrrrrrt.',
        '.ttttttttttt',
        '..gggggggg..',
        '.ggkggggkgg.',
        '.gkkyggykkg.',
        '.gggggggggg.',
        '.ggggkkgggg.',
        '..gkggggkg..',
        '..ggkkkkgg..',
        '...gggggg...',
        '..rrrrrrrr..',
        '..tttttttt..',
      ],
      { r: 0xc82828, t: 0xf4eee4, g: 0x58a832, k: 0x1c2814, y: 0xffe438 },
      2,
    );

    // Miniature red-and-gold toy steam locomotive.
    drawGrid(
      'xmas-train',
      [
        '..............kk....',
        '....gggggg....kk....',
        '....grrrrg...kkkk...',
        '....grwwrg....kk....',
        '....grwwrg..dddddd..',
        '...ggggggggddddddddl',
        '..rrrrrrrrrrrrrrrrgl',
        '..rrrrrrrrrrrrrrrrg.',
        '..ggggggggggggggggrr',
        '...ww..ww..ww..ww.rr',
        '..wggwwggwwggwwggw..',
        '...ww..ww..ww..ww...',
      ],
      {
        r: 0xc82824,
        g: 0xf0c244,
        d: 0x282c34,
        k: 0x1c1e24,
        w: 0xf8f0dc,
        l: 0xfff280,
      },
      2,
    );

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

  private lightHearth(sx: number, sy: number): void {
    // Cover the static painted flame tips with clean firebox bricks so the animated flames own the motion.
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

    // Keep the right stone fireplace pillar in front of the outer flames.
    this.add
      .image(0, 0, 'cabin-interior')
      .setOrigin(0, 0)
      .setDisplaySize(PLATE_W, PLATE_H)
      .setDepth(2.2)
      .setCrop(1295, 380, 81, 210);

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

    FIRES.forEach((fire, i) => {
      const scale = sx * fire.s;
      const flame = this.add
        .image(fire.x * sx, fire.y * sy, 'xmas-flame')
        .setOrigin(0.5, 1)
        .setDepth(2)
        .setScale(scale);
      this.tweens.add({
        targets: flame,
        scaleX: scale * (i % 2 === 0 ? 0.84 : 1.14),
        scaleY: scale * 1.38,
        angle: (i % 2 === 0 ? -1 : 1) * 4,
        duration: 150 + (i % 4) * 55,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.time.addEvent({
        delay: 120 + (i % 4) * 35,
        loop: true,
        callback: () => flame.setTint(Phaser.Math.RND.pick([0xffffff, 0xfff0b0, 0xffb060, 0xff7a28])),
      });
    });

    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const base = FIRES[Phaser.Math.Between(0, FIRES.length - 1)];
        const ember = this.add
          .rectangle(
            (base.x + Phaser.Math.Between(-10, 10)) * sx,
            (base.y - 12) * sy,
            3 * sx,
            3 * sy,
            0xffd460,
            0.9,
          )
          .setDepth(2.1);
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
    COVERS.forEach((cover) => {
      // ponytail: a hide outside its crop stands on top of the prop. Upgrade path is a drawn mask.
      const top = cover.hide.y - ELF_SRC_H;
      if (top < cover.crop.y || cover.hide.y > cover.crop.y + cover.crop.h) {
        throw new Error('elf hide is outside its cover');
      }
      const { x, y, w, h } = cover.crop;
      this.add
        .image(0, 0, 'cabin-interior')
        .setOrigin(0, 0)
        .setDisplaySize(PLATE_W, PLATE_H)
        .setDepth(3.5)
        .setCrop(x, y, w, h);
    });

    const scale = sx * ELF_SCALE;
    ELVES_POINTS.forEach((points, i) => {
      const cover = COVERS[i];
      const openKey = `elf-${i}`;
      const shutKey = `elf-${i}-shut`;
      const sprite = this.add
        .image(cover.hide.x * sx, cover.hide.y * sy, openKey)
        .setOrigin(0.5, 1)
        .setDepth(2 + cover.hide.y / SRC_H)
        .setScale(scale);
      const elf: Elf = {
        sprite,
        openKey,
        shutKey,
        points,
        hide: cover.hide,
        rim: cover.crop.y,
        step: points.length - 1,
        mood: 'hide',
      };
      this.elves.push(elf);
      this.time.delayedCall(i * 500, () => this.blinkElf(elf));
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
    elf.sprite.setTexture(elf.openKey).setScale(scale).setDepth(2 + elf.hide.y / SRC_H);
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: elf.hide.y * this.sy,
      duration: 280,
      ease: 'Quad.easeIn',
    });
  }

  private blinkElf(elf: Elf): void {
    this.time.delayedCall(Phaser.Math.Between(1800, 4200), () => {
      if (elf.mood !== 'open') {
        this.blinkElf(elf);
        return;
      }
      elf.sprite.setTexture(elf.shutKey);
      this.time.delayedCall(140, () => {
        if (elf.mood === 'open') elf.sprite.setTexture(elf.openKey);
        this.blinkElf(elf);
      });
    });
  }

  private waitElf(elf: Elf): void {
    elf.mood = 'open';
    elf.sprite.setTexture(elf.openKey);
    this.tweens.add({
      targets: elf.sprite,
      x: elf.sprite.x + this.sx,
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
    elf.sprite.setTexture(elf.openKey).setScale(scale).setDepth(2 + elf.hide.y / SRC_H);
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
        elf.sprite.setTexture(elf.shutKey);
        this.time.delayedCall(150, () => {
          if (this.elfHolds > 0) {
            this.tuckElf(elf);
            return;
          }
          elf.sprite.setTexture(elf.openKey);
          this.time.delayedCall(Phaser.Math.Between(750, 1150), () => {
            if (this.elfHolds > 0) {
              this.tuckElf(elf);
              return;
            }
            this.yankElf(elf);
          });
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
    elf.sprite.setScale(scale).setDepth(2 + next.y / SRC_H);
    this.tweens.add({
      targets: elf.sprite,
      x: next.x * this.sx,
      y: next.y * this.sy,
      duration: Phaser.Math.Between(1100, 1700),
      ease: 'Sine.easeInOut',
      onComplete: () => this.waitElf(elf),
    });
  }

  /** Beat 1: Santa's sleigh glides behind the bay window frames and across the moon. */
  private setupSleigh(sx: number, sy: number): void {
    const sprite = this.add
      .image(SLEIGH.x0 * sx, SLEIGH.y0 * sy, 'xmas-sleigh')
      .setOrigin(0.5)
      .setScale(sx * SLEIGH.scale)
      .setDepth(1.2)
      .setVisible(false);

    this.runSleigh = () => {
      this.tweens.killTweensOf(sprite);
      sprite
        .setVisible(true)
        .setAlpha(0.92)
        .setPosition(SLEIGH.x0 * sx, SLEIGH.y0 * sy)
        .setAngle(-2);

      this.tweens.add({
        targets: sprite,
        x: SLEIGH.x1 * sx,
        y: SLEIGH.y1 * sy,
        duration: SLEIGH_MS,
        ease: 'Linear',
        onComplete: () => {
          this.tweens.killTweensOf(sprite);
          sprite.setVisible(false);
        },
      });
      this.tweens.add({
        targets: sprite,
        angle: 2,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };
  }

  /** Beat 2: Rudolph rises at the center windowsill with a glowing red nose. */
  private setupRudolph(sx: number, sy: number): void {
    const body = this.add
      .image(RUDOLPH.x * sx, RUDOLPH.hideY * sy, 'xmas-rudolph')
      .setOrigin(0.5, 1)
      .setScale(sx * RUDOLPH.scale)
      .setDepth(1.5)
      .setVisible(false);

    const noseGlow = this.add
      .ellipse((RUDOLPH.x - 29) * sx, (RUDOLPH.showY - 34) * sy, 22 * sx, 22 * sy, 0xff2a2a, 0)
      .setDepth(1.6)
      .setVisible(false);

    this.runRudolph = () => {
      this.tweens.killTweensOf(body);
      this.tweens.killTweensOf(noseGlow);
      body
        .setVisible(true)
        .setTexture('xmas-rudolph')
        .setPosition(RUDOLPH.x * sx, RUDOLPH.hideY * sy);
      noseGlow.setVisible(false).setAlpha(0);

      this.tweens.add({
        targets: body,
        y: RUDOLPH.showY * sy,
        duration: 950,
        ease: 'Sine.easeOut',
        onComplete: () => {
          noseGlow.setVisible(true).setAlpha(0.55);
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
            this.tweens.add({
              targets: body,
              y: RUDOLPH.hideY * sy,
              duration: 850,
              ease: 'Sine.easeIn',
              onComplete: () => body.setVisible(false),
            });
          });
        },
      });
    };
  }

  /** Beat 3: The Grinch sneaks up outside the window, scattering the elves. */
  private setupGrinch(sx: number, sy: number): void {
    const body = this.add
      .image(GRINCH.x0 * sx, GRINCH.hideY * sy, 'xmas-grinch')
      .setOrigin(0.5, 1)
      .setScale(sx * GRINCH.scale)
      .setDepth(1.5)
      .setVisible(false);

    this.runGrinch = () => {
      this.quietElves();
      this.tweens.killTweensOf(body);
      body
        .setVisible(true)
        .setAngle(0)
        .setPosition(GRINCH.x0 * sx, GRINCH.hideY * sy);

      this.tweens.add({
        targets: body,
        y: GRINCH.showY * sy,
        duration: 850,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: body,
            x: GRINCH.x1 * sx,
            angle: 5,
            duration: 1800,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
          this.time.delayedCall(GRINCH_HOLD, () => {
            this.tweens.add({
              targets: body,
              y: GRINCH.hideY * sy,
              angle: 0,
              duration: 750,
              ease: 'Quad.easeIn',
              onComplete: () => {
                body.setVisible(false);
                this.freeElves();
              },
            });
          });
        },
      });
    };
  }

  /** Beat 4: Miniature steam locomotive chugs across the foreground floorboards. */
  private setupTrain(sx: number, sy: number): void {
    const train = this.add
      .image(TRAIN.x0 * sx, TRAIN.y * sy, 'xmas-train')
      .setOrigin(0.5, 1)
      .setScale(sx * TRAIN.scale)
      .setDepth(6)
      .setVisible(false);

    let steamTimer: Phaser.Time.TimerEvent | undefined;

    this.runTrain = () => {
      this.quietElves();
      this.tweens.killTweensOf(train);
      steamTimer?.remove(false);

      train.setVisible(true).setPosition(TRAIN.x0 * sx, TRAIN.y * sy);
      this.tweens.add({
        targets: train,
        y: (TRAIN.y - 2) * sy,
        scaleY: sx * TRAIN.scale * 1.04,
        duration: 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      steamTimer = this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          if (!train.visible) return;
          const puff = this.add
            .image(train.x + 18 * sx, train.y - 48 * sy, 'xmas-steam')
            .setAlpha(0.85)
            .setScale(sx * 0.8)
            .setDepth(5.9);
          this.tweens.add({
            targets: puff,
            x: puff.x - Phaser.Math.Between(14, 28) * sx,
            y: puff.y - Phaser.Math.Between(28, 52) * sy,
            scale: sx * 1.9,
            alpha: 0,
            duration: Phaser.Math.Between(900, 1400),
            ease: 'Sine.easeOut',
            onComplete: () => puff.destroy(),
          });
        },
      });

      this.tweens.add({
        targets: train,
        x: TRAIN.x1 * sx,
        duration: TRAIN_MS,
        ease: 'Linear',
        onComplete: () => {
          steamTimer?.remove(false);
          steamTimer = undefined;
          this.tweens.killTweensOf(train);
          train.setVisible(false);
          this.freeElves();
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
