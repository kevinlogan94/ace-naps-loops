import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import { crossedBeat, formatTime, wrap } from '../../../systems/storyClock';
import aceUrl from '../pumpkin-patch/images/ace.png';
import { type ChristmasWho, mountChristmas2026Editor } from './christmas2026Editor';
import bedUrl from './images/bed.png';
import foregroundUrl from './images/cabin-foreground.png';
import interiorUrl from './images/cabin-interior.png';
import car1DownUrl from './images/car1-down.png';
import car1UpUrl from './images/car1-up.png';
import car1Url from './images/car1.png';
import car2DownUrl from './images/car2-down.png';
import car2UpUrl from './images/car2-up.png';
import car2Url from './images/car2.png';
import elf0Url from './images/elf-0.png';
import elf1Url from './images/elf-1.png';
import elf2Url from './images/elf-2.png';
import elf3Url from './images/elf-3.png';
import fireUrl from './images/fire.png';
import grinchUrl from './images/grinch.png';
import outsideUrl from './images/outside.jpg';
import rudolphUrl from './images/rudolph.png';
import sleigh0Url from './images/sleigh-0.png';
import sleigh1Url from './images/sleigh-1.png';
import sleigh2Url from './images/sleigh-2.png';
import sleigh3Url from './images/sleigh-3.png';
import sleigh4Url from './images/sleigh-4.png';
import sleigh5Url from './images/sleigh-5.png';
import starUrl from './images/star.png';
import trackUrl from './images/track.png';
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

/** Mantel candle wick bases on the left of the fireplace mantel. */
const CANDLES = [
  { x: 1106, y: 170, s: 0.9 },
  { x: 1131, y: 158, s: 1.05 },
] as const;

/** Twinkling star positions in the night sky outside the bay windows. */
const SKY_STARS: [number, number][] = [
  [408, 118],
  [470, 146],
  [564, 122],
  [596, 178],
  [632, 112],
  [654, 214],
  [688, 152],
  [712, 232],
  [766, 224],
  [808, 186],
  [820, 118],
  [898, 134],
  [962, 116],
  [974, 170],
];

/** Tree star and all 81 fairy-light bulb positions in source pixels. */
const TREE_STAR = { x: 168, y: 34 };
const TREE_LIGHTS: [number, number][] = [
  [180, 80], [146, 93], [190, 103], [223, 119], [166, 121], [120, 122], [199, 121], [143, 140], [236, 182],
  [152, 191], [223, 195], [192, 207], [168, 212], [232, 217], [79, 221], [150, 222], [200, 225], [117, 229],
  [81, 239], [257, 237], [290, 249], [96, 258], [198, 270], [126, 273], [274, 274], [87, 279], [150, 282],
  [167, 287], [197, 290], [216, 290], [278, 290], [245, 291], [69, 310], [257, 316], [109, 331], [306, 341],
  [154, 348], [297, 355], [28, 365], [309, 375], [278, 376], [35, 380], [143, 380], [250, 384], [49, 398],
  [212, 403], [234, 403], [102, 409], [64, 410], [191, 419], [80, 422], [212, 425], [166, 426], [135, 432],
  [48, 433], [117, 433], [6, 434], [101, 433], [260, 434], [343, 436], [22, 441], [340, 452], [81, 452],
  [3, 458], [320, 468], [216, 472], [303, 476], [255, 478], [287, 477], [30, 483], [239, 481], [154, 485],
  [330, 489], [44, 491], [99, 499], [62, 497], [181, 498], [131, 503], [151, 511], [116, 514], [250, 519],
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

/** Miniature 3-car toy steam train enters from the left, loops around Ace's bed on the track, and exits left. */
const TRAIN = {
  xStart: -90,
  xLeft: 475,
  xRight: 918,
  yFront: 742,
  yBack: 612,
  carGap: 62,
  scale: 0.48,
  durationMs: 17_500,
};

/** Four 16-bit elves hide behind the cabin-foreground.png gift/log layer (depth 3.5). */
const ELF_SCALE = 0.44;
const ELF_TEX_H = 148;
const ELF_SRC_H = ELF_TEX_H * ELF_SCALE * (PLATE_W / SRC_W) / (PLATE_H / SRC_H);
const PEEK = 36;
const ELF_GAP = 2 * 60 * 1000;

const ELVES_CFG: {
  key: string;
  hide: { x: number; y: number };
  rim: number;
  points: { x: number; y: number }[];
}[] = [
  // Elf 0 (green hat): hides behind the medium green gift box, jumps out onto the front rug.
  {
    key: 'elf-0',
    hide: { x: 222, y: 660 },
    rim: 586,
    points: [
      { x: 206, y: 696 },
      { x: 268, y: 712 },
      { x: 332, y: 702 },
    ],
  },
  // Elf 1 (red hat): hides behind the tall gold gift box, jumps out toward Ace's bed.
  {
    key: 'elf-1',
    hide: { x: 326, y: 636 },
    rim: 548,
    points: [
      { x: 396, y: 676 },
      { x: 446, y: 704 },
      { x: 382, y: 716 },
    ],
  },
  // Elf 2 (striped hat): hides behind the left red gift box, jumps out onto the left rug.
  {
    key: 'elf-2',
    hide: { x: 58, y: 642 },
    rim: 558,
    points: [
      { x: 124, y: 694 },
      { x: 178, y: 714 },
      { x: 112, y: 718 },
    ],
  },
  // Elf 3 (gold-trimmed hat): hides behind the firewood logs, jumps out toward the milk & cookies.
  {
    key: 'elf-3',
    hide: { x: 1300, y: 705 },
    rim: 622,
    points: [
      { x: 1152, y: 678 },
      { x: 1072, y: 704 },
      { x: 1134, y: 726 },
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
    this.load.image('xmas-star', starUrl);
    this.load.image('xmas-sleigh-0', sleigh0Url);
    this.load.image('xmas-sleigh-1', sleigh1Url);
    this.load.image('xmas-sleigh-2', sleigh2Url);
    this.load.image('xmas-sleigh-3', sleigh3Url);
    this.load.image('xmas-sleigh-4', sleigh4Url);
    this.load.image('xmas-sleigh-5', sleigh5Url);
    this.load.image('xmas-rudolph', rudolphUrl);
    this.load.image('xmas-grinch', grinchUrl);
    this.load.image('xmas-track', trackUrl);
    this.load.image('xmas-train', trainUrl);
    this.load.image('xmas-train-up', trainUpUrl);
    this.load.image('xmas-train-down', trainDownUrl);
    this.load.image('xmas-car1', car1Url);
    this.load.image('xmas-car1-up', car1UpUrl);
    this.load.image('xmas-car1-down', car1DownUrl);
    this.load.image('xmas-car2', car2Url);
    this.load.image('xmas-car2-up', car2UpUrl);
    this.load.image('xmas-car2-down', car2DownUrl);
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
      'xmas-star',
      'xmas-sleigh-0',
      'xmas-sleigh-1',
      'xmas-sleigh-2',
      'xmas-sleigh-3',
      'xmas-sleigh-4',
      'xmas-sleigh-5',
      'xmas-rudolph',
      'xmas-grinch',
      'xmas-track',
      'xmas-train',
      'xmas-train-up',
      'xmas-train-down',
      'xmas-car1',
      'xmas-car1-up',
      'xmas-car1-down',
      'xmas-car2',
      'xmas-car2-up',
      'xmas-car2-down',
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

    // Layer 2.3: Toy train track on the cabin floorboards (loops behind bed.png at depth 3.6).
    this.add.image(0, 0, 'xmas-track').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(2.3);

    // Layer 3 (depth 3.5): Foreground presents, firewood logs, and right fireplace pillar.
    this.add.image(0, 0, 'cabin-foreground').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(3.5);

    // Layer 4 (depth 3.6): Dedicated layer for Ace's dog bed.
    this.add.image(0, 0, 'ace-bed').setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(3.6);

    this.makeTextures();
    this.lightSky(sx, sy);
    this.spawnSnow();
    this.lightTree(sx, sy);
    this.lightCandles(sx, sy);
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
    drawGrid(
      'xmas-sparkle',
      ['...y...', '...y...', '..yyy..', 'yyyyyyy', '..yyy..', '...y...', '...y...'],
      { y: 0xffe878 },
      2,
    );
    drawGrid(
      'xmas-candle',
      ['.y.', 'ywy', 'ywy', 'oyo', '.o.'],
      { w: 0xffffe8, y: 0xffe468, o: 0xff9428 },
      2,
    );
    g.destroy();

    // Smooth radial gradient helper for additive light pools and fairy-light bulbs.
    const makeRadial = (key: string, size: number, stops: [number, string][]) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, size, size);
      if (!tex) return;
      const ctx = tex.getContext();
      const half = size / 2;
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
      for (const [stop, color] of stops) grad.addColorStop(stop, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    };

    makeRadial('xmas-light', 128, [
      [0, 'rgba(255, 182, 78, 0.78)'],
      [0.45, 'rgba(255, 126, 36, 0.36)'],
      [0.8, 'rgba(235, 84, 16, 0.08)'],
      [1, 'rgba(220, 64, 8, 0)'],
    ]);
    makeRadial('xmas-moonlight', 128, [
      [0, 'rgba(175, 220, 255, 0.62)'],
      [0.45, 'rgba(115, 172, 245, 0.25)'],
      [0.8, 'rgba(72, 128, 220, 0.06)'],
      [1, 'rgba(55, 105, 200, 0)'],
    ]);
    makeRadial('xmas-bulb', 32, [
      [0, 'rgba(255, 255, 255, 1)'],
      [0.2, 'rgba(255, 252, 232, 0.86)'],
      [0.45, 'rgba(255, 238, 180, 0.32)'],
      [1, 'rgba(255, 220, 140, 0)'],
    ]);
  }

  /** Staggered star twinkles, an occasional shooting star, and silver-blue moonlight spilling into the cabin. */
  private lightSky(sx: number, sy: number): void {
    SKY_STARS.forEach(([x, y], i) => {
      const star = this.add
        .rectangle(x * sx, y * sy, 2 * sx, 2 * sy, i % 3 === 0 ? 0xd8ecff : 0xfff8dc, 0.25)
        .setDepth(0.5);
      this.tweens.add({
        targets: star,
        alpha: 0.95,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 1100 + (i % 5) * 340,
        delay: (i * 270) % 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Soft silver-blue moonlight halo outside + cool beams spilling across the bay windowsill and Ace's bed.
    const moonPools = [
      { x: 750, y: 148, w: 280, h: 280, depth: 0.4, a0: 0.34, a1: 0.5, dur: 3800 },
      { x: 688, y: 454, w: 580, h: 220, depth: 2.0, a0: 0.26, a1: 0.36, dur: 4200 },
      { x: 688, y: 610, w: 540, h: 270, depth: 3.8, a0: 0.2, a1: 0.28, dur: 4600 },
    ];
    for (const p of moonPools) {
      const pool = this.add
        .image(p.x * sx, p.y * sy, 'xmas-moonlight')
        .setDisplaySize(p.w * sx, p.h * sy)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(p.depth)
        .setAlpha(p.a0);
      this.tweens.add({
        targets: pool,
        alpha: p.a1,
        duration: p.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const shoot = () => {
      const x0 = Phaser.Math.Between(560, 720);
      const y0 = Phaser.Math.Between(102, 152);
      const streak = this.add
        .rectangle(x0 * sx, y0 * sy, 24 * sx, 2 * sy, 0xeef6ff, 0)
        .setAngle(22)
        .setDepth(0.6);
      this.tweens.add({
        targets: streak,
        x: (x0 + 110) * sx,
        y: (y0 + 44) * sy,
        alpha: { from: 0.9, to: 0 },
        duration: 620,
        ease: 'Quad.easeOut',
        onComplete: () => streak.destroy(),
      });
    };
    this.time.addEvent({ delay: 28_000, loop: true, callback: shoot });
  }

  /** Flickering flames and warm additive candlelight halos illuminating the mantel and stone chimney. */
  private lightCandles(sx: number, sy: number): void {
    CANDLES.forEach((c, i) => {
      const outerW = 165 * sx * c.s;
      const outerH = 165 * sy * c.s;
      const outerHalo = this.add
        .image(c.x * sx, (c.y - 8) * sy, 'xmas-light')
        .setDisplaySize(outerW, outerH)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2.02)
        .setAlpha(0.46);
      this.tweens.add({
        targets: outerHalo,
        alpha: 0.72,
        displayWidth: outerW * 1.12,
        displayHeight: outerH * 1.12,
        duration: 460 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const innerW = 52 * sx * c.s;
      const innerH = 52 * sy * c.s;
      const innerHalo = this.add
        .image(c.x * sx, (c.y - 6) * sy, 'xmas-bulb')
        .setTint(0xffd478)
        .setDisplaySize(innerW, innerH)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2.06)
        .setAlpha(0.55);
      this.tweens.add({
        targets: innerHalo,
        alpha: 0.85,
        displayWidth: innerW * 1.16,
        displayHeight: innerH * 1.16,
        duration: 240 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const flame = this.add
        .image(c.x * sx, c.y * sy, 'xmas-candle')
        .setOrigin(0.5, 1)
        .setScale(sx * c.s)
        .setDepth(2.1);
      this.tweens.add({
        targets: flame,
        scaleX: sx * c.s * 0.85,
        scaleY: sx * c.s * 1.22,
        angle: i === 0 ? 5 : -5,
        duration: 180 + i * 55,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
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

  /** Warm tree glow, twinkling pixel-art star topper, and all 81 twinkling fairy lights. */
  private lightTree(sx: number, sy: number): void {
    // Warm ambient glow radiating from the Christmas tree onto the dark wall, presents, and rug.
    const treeWash = this.add
      .image(170 * sx, 320 * sy, 'xmas-light')
      .setDisplaySize(540 * sx, 640 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1.95)
      .setAlpha(0.32);
    this.tweens.add({
      targets: treeWash,
      alpha: 0.44,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const presentBounce = this.add
      .image(185 * sx, 585 * sy, 'xmas-light')
      .setDisplaySize(480 * sx, 250 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3.8)
      .setAlpha(0.28);
    this.tweens.add({
      targets: presentBounce,
      alpha: 0.38,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Dynamic twinkling star topper (additive halo + extracted star.png + center sparkle glint).
    const starHaloW = 148 * sx;
    const starHaloH = 148 * sy;
    const starHalo = this.add
      .image(TREE_STAR.x * sx, TREE_STAR.y * sy, 'xmas-light')
      .setDisplaySize(starHaloW, starHaloH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.02)
      .setAlpha(0.45);
    this.tweens.add({
      targets: starHalo,
      alpha: 0.9,
      displayWidth: starHaloW * 1.18,
      displayHeight: starHaloH * 1.18,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const starSprite = this.add
      .image(TREE_STAR.x * sx, TREE_STAR.y * sy, 'xmas-star')
      .setOrigin(0.5)
      .setScale(sx * 0.96, sy * 0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.05)
      .setAlpha(0.35);
    this.tweens.add({
      targets: starSprite,
      alpha: 1,
      scaleX: sx * 1.06,
      scaleY: sy * 1.06,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const starGlint = this.add
      .image(TREE_STAR.x * sx, (TREE_STAR.y + 2) * sy, 'xmas-sparkle')
      .setScale(sx * 1.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.08)
      .setAlpha(0.12);
    this.tweens.add({
      targets: starGlint,
      alpha: 0.92,
      scaleX: sx * 1.75,
      scaleY: sy * 1.75,
      angle: 45,
      duration: 980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // All 81 tree fairy-light bulbs twinkling independently with warm golden-white additive glows.
    const tints = [0xfff4c2, 0xffe28a, 0xffd26a, 0xfff9dc, 0xffbe60];
    TREE_LIGHTS.forEach(([lx, ly], i) => {
      const minW = 10 * sx;
      const maxW = (17 + (i % 3) * 2) * sx;
      const bulb = this.add
        .image(lx * sx, ly * sy, 'xmas-bulb')
        .setTint(tints[i % tints.length])
        .setDisplaySize(minW, minW)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2.04)
        .setAlpha(0.08);
      this.tweens.add({
        targets: bulb,
        alpha: 0.96,
        displayWidth: maxW,
        displayHeight: maxW,
        duration: 620 + (i % 7) * 160,
        delay: (i * 173) % 1450,
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

    // Dynamic additive firelight spilling softly onto the hearth, stockings, floorboards, and Ace's bed.
    const hearthLight = this.add
      .image(1140 * sx, 600 * sy, 'xmas-light')
      .setDisplaySize(660 * sx, 420 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3.8)
      .setAlpha(0.46);
    const floorLight = this.add
      .image(910 * sx, 668 * sy, 'xmas-light')
      .setDisplaySize(800 * sx, 350 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3.8)
      .setAlpha(0.34);
    const mantelLight = this.add
      .image(1185 * sx, 395 * sy, 'xmas-light')
      .setDisplaySize(400 * sx, 340 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.2)
      .setAlpha(0.28);

    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const intensity = Phaser.Math.FloatBetween(0.4, 1.0);
        const reach = 0.97 + intensity * 0.06;
        this.tweens.add({
          targets: hearthLight,
          alpha: 0.34 + intensity * 0.22,
          displayWidth: 660 * sx * reach,
          displayHeight: 420 * sy * reach,
          duration: 360,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: floorLight,
          alpha: 0.22 + intensity * 0.2,
          x: (910 - intensity * 8) * sx,
          displayWidth: 800 * sx * reach,
          displayHeight: 350 * sy * reach,
          duration: 360,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: mantelLight,
          alpha: 0.18 + intensity * 0.16,
          duration: 360,
          ease: 'Sine.easeInOut',
        });
      },
    });

    const fireLayers = [
      { x: 1249, y: 536, sx0: 1.02, sy0: 0.94, sy1: 1.06, flip: false, angle: 2, dur: 420, tints: [0xff9c42, 0xffb452] },
      { x: 1246, y: 538, sx0: 0.95, sy0: 0.88, sy1: 1.08, flip: true, angle: -2.5, dur: 340, tints: [0xffcf6e, 0xffa642] },
      { x: 1251, y: 536, sx0: 0.88, sy0: 0.84, sy1: 1.02, flip: false, angle: 1.5, dur: 290, tints: [0xfff2c2, 0xffe498] },
    ];
    fireLayers.forEach((cfg, i) => {
      const f = this.add
        .image(cfg.x * sx, cfg.y * sy, 'xmas-fire')
        .setOrigin(0.5, 1)
        .setFlipX(cfg.flip)
        .setScale(sx * cfg.sx0, sy * cfg.sy0)
        .setAlpha(0.88)
        .setDepth(2 + i * 0.05);
      this.tweens.add({
        targets: f,
        scaleX: sx * cfg.sx0 * 0.95,
        scaleY: sy * cfg.sy1,
        angle: cfg.angle,
        duration: cfg.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.time.addEvent({
        delay: 320 + i * 75,
        loop: true,
        callback: () => f.setTint(Phaser.Math.RND.pick(cfg.tints)),
      });
    });

    this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        const ember = this.add
          .rectangle(
            Phaser.Math.Between(1218, 1282) * sx,
            515 * sy,
            2.5 * sx,
            2.5 * sy,
            0xffd460,
            0.65,
          )
          .setDepth(2.15);
        this.tweens.add({
          targets: ember,
          x: ember.x + Phaser.Math.Between(-10, 10) * sx,
          y: ember.y - Phaser.Math.Between(38, 72) * sy,
          alpha: 0,
          duration: Phaser.Math.Between(1200, 1900),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy(),
        });
      },
    });
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
    if (elf.sprite.depth > 3.1) {
      const crestY = (elf.rim + 18) * this.sy;
      this.tweens.add({
        targets: elf.sprite,
        x: elf.hide.x * this.sx,
        y: crestY,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => {
          elf.sprite.setDepth(3.0);
          this.tweens.add({
            targets: elf.sprite,
            y: elf.hide.y * this.sy,
            duration: 160,
            ease: 'Quad.easeIn',
          });
        },
      });
    } else {
      elf.sprite.setDepth(3.0);
      this.tweens.add({
        targets: elf.sprite,
        x: elf.hide.x * this.sx,
        y: elf.hide.y * this.sy,
        duration: 240,
        ease: 'Quad.easeIn',
      });
    }
  }

  /** Elf checks on sleeping Ace, glances at the tree/cookies for Santa, and gives a cheerful nod with a magic sparkle. */
  private waitElf(elf: Elf): void {
    elf.mood = 'open';
    const { sx, sy } = this;
    const baseY = elf.sprite.y;
    const lookRightAtAce = elf.sprite.x < BED.x * sx;

    // 1. Turn to look over at sleeping Ace with a curious head tilt.
    elf.sprite.setFlipX(!lookRightAtAce).setAngle(0);
    this.tweens.add({
      targets: elf.sprite,
      angle: lookRightAtAce ? 4 : -4,
      duration: 450,
      yoyo: true,
      hold: 450,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (elf.mood !== 'open') return;
        // 2. Glance back at the presents / cookies to inspect them for Santa.
        elf.sprite.setFlipX(lookRightAtAce);
        this.time.delayedCall(750, () => {
          if (elf.mood !== 'open') return;
          // 3. Look back at Ace and do a happy double-nod with a golden Christmas magic sparkle.
          elf.sprite.setFlipX(!lookRightAtAce);
          const star = this.add
            .image(elf.sprite.x, baseY - 68 * sy, 'xmas-sparkle')
            .setScale(sx * 0.65)
            .setAlpha(0.95)
            .setDepth(elf.sprite.depth + 0.05);
          this.tweens.add({
            targets: star,
            y: star.y - 20 * sy,
            angle: 45,
            alpha: 0,
            duration: 900,
            ease: 'Sine.easeOut',
            onComplete: () => star.destroy(),
          });
          this.tweens.add({
            targets: elf.sprite,
            y: baseY - 6 * sy,
            duration: 150,
            yoyo: true,
            repeat: 1,
            ease: 'Quad.easeOut',
          });
        });
      },
    });

    elf.wait = this.time.delayedCall(Phaser.Math.Between(3400, 4600), () => {
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
    const crestY = (elf.rim + 18) * this.sy;
    // Jump up to the top rim of the present/log in front (depth 3.55), then drop behind it (depth 3.0).
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: crestY,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => {
        elf.sprite.setDepth(3.0);
        this.tweens.add({
          targets: elf.sprite,
          y: elf.hide.y * this.sy,
          duration: 180,
          ease: 'Quad.easeIn',
          onComplete: () => this.hideElf(elf),
        });
      },
    });
  }

  private hideElf(elf: Elf): void {
    elf.mood = 'hide';
    elf.sprite.setDepth(3.0);
    if (this.elfHolds > 0) return;
    this.time.delayedCall(Phaser.Math.Between(1400, 2400), () => {
      if (this.elfHolds > 0 || elf.mood !== 'hide') return;
      this.peekElf(elf);
    });
  }

  private peekElf(elf: Elf): void {
    elf.mood = 'peek';
    elf.sprite.setDepth(3.0).setAngle(0);
    // Face toward Ace while peeking over the present/logs.
    elf.sprite.setFlipX(elf.hide.x > BED.x);
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
    elf.sprite.setScale(scale).setAngle(0).setFlipX(next.x * this.sx < elf.sprite.x);

    // Always pop up behind the present/log (depth 3.0), then hop over the top rim onto the front rug (depth 3.55).
    elf.sprite.setDepth(3.0).setPosition(elf.hide.x * this.sx, elf.hide.y * this.sy);
    const crestY = (elf.rim + 18) * this.sy;
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide.x * this.sx,
      y: crestY,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.elfHolds > 0) {
          this.tuckElf(elf);
          return;
        }
        elf.sprite.setDepth(3.55);
        this.tweens.add({
          targets: elf.sprite,
          x: next.x * this.sx,
          y: next.y * this.sy,
          duration: 380,
          ease: 'Quad.easeIn',
          onComplete: () => this.waitElf(elf),
        });
      },
    });
  }

  /** Beat 1: Distant Santa sleigh with 6-frame staggered galloping reindeer crossing the moon. */
  private setupSleigh(sx: number, sy: number): void {
    const sprite = this.add
      .image(SLEIGH.x0 * sx, SLEIGH.y0 * sy, 'xmas-sleigh-0')
      .setOrigin(0.5)
      .setScale(sx * SLEIGH.scale)
      .setDepth(1.2)
      .setVisible(false);

    let gallopTimer: Phaser.Time.TimerEvent | undefined;
    let frame = 0;

    this.runSleigh = () => {
      this.tweens.killTweensOf(sprite);
      gallopTimer?.remove(false);
      frame = 0;

      sprite
        .setVisible(true)
        .setTexture('xmas-sleigh-0')
        .setAlpha(0.92)
        .setPosition(SLEIGH.x0 * sx, SLEIGH.y0 * sy)
        .setAngle(-2);

      gallopTimer = this.time.addEvent({
        delay: 90,
        loop: true,
        callback: () => {
          frame = (frame + 1) % 6;
          sprite.setTexture(`xmas-sleigh-${frame}`);
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

  /** Beat 4: 3-car miniature steam train (Locomotive + Gift Car + Caboose) loops around Ace's bed on the track. */
  private setupTrain(sx: number, sy: number): void {
    const carDefs = [
      { side: 'xmas-train', up: 'xmas-train-up', down: 'xmas-train-down' },
      { side: 'xmas-car1', up: 'xmas-car1-up', down: 'xmas-car1-down' },
      { side: 'xmas-car2', up: 'xmas-car2-up', down: 'xmas-car2-down' },
    ];
    const cars = carDefs.map((d) =>
      this.add
        .image(TRAIN.xStart * sx, TRAIN.yFront * sy, d.side)
        .setOrigin(0.5, 1)
        .setScale(sx * TRAIN.scale)
        .setDepth(4.2)
        .setVisible(false),
    );

    // Soft additive headlamp flare + directional track glow matching the cabin's dynamic lighting.
    const lampBulb = this.add
      .image(0, 0, 'xmas-bulb')
      .setTint(0xfff4c2)
      .setDisplaySize(24 * sx, 24 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4.26)
      .setAlpha(0.92)
      .setVisible(false);
    const lampBeam = this.add
      .image(0, 0, 'xmas-light')
      .setDisplaySize(160 * sx, 76 * sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4.24)
      .setAlpha(0.45)
      .setVisible(false);

    // Piecewise straight + R=32 quarter-circle arc path matching track.png pixel-for-pixel.
    const R = 32;
    const ARC = (Math.PI / 2) * R;
    const S0 = TRAIN.xRight - R - TRAIN.xStart; // Front straight: xStart -> 886
    const S1 = TRAIN.yFront - R - (TRAIN.yBack + R); // Right straight: 710 -> 644
    const S2 = TRAIN.xRight - R - (TRAIN.xLeft + R); // Back straight: 886 -> 507
    const S3 = S1; // Left straight: 644 -> 710
    const S4 = TRAIN.xLeft - R - TRAIN.xStart; // Exit straight: 443 -> xStart
    const totalLen = S0 + ARC + S1 + ARC + S2 + ARC + S3 + ARC + S4;
    const maxDist = totalLen + (cars.length - 1) * TRAIN.carGap;

    const poseAt = (
      d: number,
    ): { x: number; y: number; dir: 'right' | 'up' | 'left' | 'down'; back: boolean } | null => {
      if (d < 0 || d > totalLen) return null;
      let u = d;
      if (u <= S0) return { x: TRAIN.xStart + u, y: TRAIN.yFront, dir: 'right', back: false };
      u -= S0;
      if (u <= ARC) {
        const a = Math.PI / 2 - (u / ARC) * (Math.PI / 2);
        return {
          x: TRAIN.xRight - R + Math.cos(a) * R,
          y: TRAIN.yFront - R + Math.sin(a) * R,
          dir: u < ARC * 0.55 ? 'right' : 'up',
          back: false,
        };
      }
      u -= ARC;
      if (u <= S1) return { x: TRAIN.xRight, y: TRAIN.yFront - R - u, dir: 'up', back: false };
      u -= S1;
      if (u <= ARC) {
        const a = -(u / ARC) * (Math.PI / 2);
        return {
          x: TRAIN.xRight - R + Math.cos(a) * R,
          y: TRAIN.yBack + R + Math.sin(a) * R,
          dir: u < ARC * 0.45 ? 'up' : 'left',
          back: u >= ARC * 0.45,
        };
      }
      u -= ARC;
      if (u <= S2) return { x: TRAIN.xRight - R - u, y: TRAIN.yBack, dir: 'left', back: true };
      u -= S2;
      if (u <= ARC) {
        const a = -Math.PI / 2 - (u / ARC) * (Math.PI / 2);
        return {
          x: TRAIN.xLeft + R + Math.cos(a) * R,
          y: TRAIN.yBack + R + Math.sin(a) * R,
          dir: u < ARC * 0.45 ? 'left' : 'down',
          back: u < ARC * 0.45,
        };
      }
      u -= ARC;
      if (u <= S3) return { x: TRAIN.xLeft, y: TRAIN.yBack + R + u, dir: 'down', back: false };
      u -= S3;
      if (u <= ARC) {
        const a = (u / ARC) * (Math.PI / 2);
        return {
          x: TRAIN.xLeft - R + Math.cos(a) * R,
          y: TRAIN.yFront - R + Math.sin(a) * R,
          dir: u < ARC * 0.45 ? 'down' : 'left',
          back: false,
        };
      }
      u -= ARC;
      return { x: TRAIN.xLeft - R - u, y: TRAIN.yFront, dir: 'left', back: false };
    };

    let steamTimer: Phaser.Time.TimerEvent | undefined;
    let driveTween: Phaser.Tweens.Tween | undefined;

    this.runTrain = () => {
      this.quietElves();
      driveTween?.stop();
      steamTimer?.remove(false);
      lampBulb.setVisible(false);
      lampBeam.setVisible(false);
      cars.forEach((c) => {
        this.tweens.killTweensOf(c);
        c.setVisible(false);
      });

      const loco = cars[0];
      steamTimer = this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          if (!loco.visible) return;
          const isSide = loco.texture.key === 'xmas-train';
          const dir = isSide ? (loco.flipX ? -1 : 1) : 0;
          const puff = this.add
            .image(loco.x + dir * 14 * sx, loco.y - 48 * sy, 'xmas-steam')
            .setAlpha(0.85)
            .setScale(sx * 0.75)
            .setDepth(loco.depth + 0.05);
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

      const state = { dist: 0 };
      driveTween = this.tweens.add({
        targets: state,
        dist: maxDist,
        duration: TRAIN.durationMs,
        ease: 'Linear',
        onUpdate: () => {
          const chug = 1 + Math.sin(this.time.now * 0.025) * 0.028;
          cars.forEach((car, i) => {
            const p = poseAt(state.dist - i * TRAIN.carGap);
            if (!p) {
              car.setVisible(false);
              if (i === 0) {
                lampBulb.setVisible(false);
                lampBeam.setVisible(false);
              }
              return;
            }
            const def = carDefs[i];
            const tex = p.dir === 'up' ? def.up : p.dir === 'down' ? def.down : def.side;
            // Subtle perspective scale-down on the back pass behind Ace's bed.
            const persp = p.back ? 0.9 : 1;
            const depth = p.back ? 3.2 : 4.2 + p.y / 1000;
            car
              .setVisible(true)
              .setTexture(tex)
              .setFlipX(p.dir === 'left')
              .setScale(sx * TRAIN.scale * persp, sx * TRAIN.scale * persp * chug)
              .setDepth(depth)
              .setPosition(p.x * sx, p.y * sy);

            if (i === 0) {
              const pulse = 0.92 + Math.sin(this.time.now * 0.015) * 0.08;
              if (p.dir === 'up') {
                lampBulb.setVisible(false);
                lampBeam
                  .setVisible(true)
                  .setDepth(depth - 0.02)
                  .setPosition(p.x * sx, (p.y - 36) * sy)
                  .setDisplaySize(86 * sx * persp, 64 * sy * persp)
                  .setAlpha(0.28 * pulse);
              } else if (p.dir === 'down') {
                lampBulb
                  .setVisible(true)
                  .setDepth(depth + 0.03)
                  .setPosition(p.x * sx, (p.y - 22) * sy)
                  .setDisplaySize(22 * sx * persp * pulse, 22 * sy * persp * pulse)
                  .setAlpha(0.88 * pulse);
                lampBeam
                  .setVisible(true)
                  .setDepth(depth + 0.01)
                  .setPosition(p.x * sx, (p.y + 18) * sy)
                  .setDisplaySize(96 * sx * persp, 118 * sy * persp)
                  .setAlpha(0.46 * pulse);
              } else {
                const sign = p.dir === 'right' ? 1 : -1;
                lampBulb
                  .setVisible(true)
                  .setDepth(depth + 0.03)
                  .setPosition((p.x + sign * 29 * persp) * sx, (p.y - 29 * persp) * sy)
                  .setDisplaySize(24 * sx * persp * pulse, 24 * sy * persp * pulse)
                  .setAlpha(0.9 * pulse);
                lampBeam
                  .setVisible(true)
                  .setDepth(depth + 0.01)
                  .setPosition((p.x + sign * 74 * persp) * sx, (p.y - 16 * persp) * sy)
                  .setDisplaySize(160 * sx * persp, 72 * sy * persp)
                  .setAlpha(0.46 * pulse);
              }
            }
          });
        },
        onComplete: () => {
          steamTimer?.remove(false);
          steamTimer = undefined;
          lampBulb.setVisible(false);
          lampBeam.setVisible(false);
          cars.forEach((c) => {
            this.tweens.killTweensOf(c);
            c.setVisible(false);
          });
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
