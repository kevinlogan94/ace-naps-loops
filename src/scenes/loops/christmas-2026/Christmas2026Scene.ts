import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import { crossedBeat, formatTime, wrap } from '../../../systems/storyClock';
import aceUrl from '../pumpkin-patch/images/ace.png';
import { type ChristmasWho, mountChristmas2026Editor } from './christmas2026Editor';

/** Source plate is 1376×768. All scene positions below are in those pixels. */
const SRC_W = 1376;
const SRC_H = 768;
const BED = { x: 690, y: 662 };
const ACE_SCALE = 1.32;

const IMAGES: [string, string][] = [
  ...Object.entries(
    import.meta.glob('./images/*.{png,jpg}', { eager: true, import: 'default' }) as Record<string, string>,
  ).map(([path, url]): [string, string] => [path.match(/\/([^/]+)\.[^.]+$/)![1], url]),
  ['ace', aceUrl],
];

/** Outdoor window bounds (masked automatically by cabin-interior at depth 1.8). */
const OUTSIDE = { x0: 378, x1: 996, y0: 64, y1: 442, wind: 3 };
const SNOW_COUNT = 36;

const CANDLES = [
  { x: 1106, y: 170, s: 0.9 },
  { x: 1131, y: 158, s: 1.05 },
] as const;

const SKY_STARS: [number, number][] = [
  [408, 118], [470, 146], [564, 122], [596, 178], [632, 112], [654, 214], [688, 152],
  [712, 232], [766, 224], [808, 186], [820, 118], [898, 134], [962, 116], [974, 170],
];

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

const SLEIGH = { x0: 330, x1: 1040, y0: 162, y1: 138, scale: 0.24, ms: 16_000 };
const TRAIN = { xStart: -90, xLeft: 475, xRight: 918, yFront: 742, yBack: 612, carGap: 62, scale: 0.48, ms: 17_500 };

/** Four 16-bit elves hide behind the cabin-foreground gift/log layer (depth 3.5). */
const ELF_SCALE = 0.44;
const ELF_SRC_H = (148 * ELF_SCALE * (PLATE_W / SRC_W)) / (PLATE_H / SRC_H);
const PEEK = 36;
const ELF_GAP = 2 * 60 * 1000;

const ELVES_CFG: { key: string; hide: [number, number]; rim: number; points: [number, number][] }[] = [
  { key: 'elf-0', hide: [222, 660], rim: 586, points: [[206, 696], [268, 712], [332, 702]] },
  { key: 'elf-1', hide: [326, 636], rim: 548, points: [[396, 676], [446, 704], [382, 716]] },
  { key: 'elf-2', hide: [58, 642], rim: 558, points: [[124, 694], [178, 714], [112, 718]] },
  { key: 'elf-3', hide: [1300, 705], rim: 622, points: [[1152, 678], [1072, 704], [1134, 726]] },
];

type Elf = {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  points: [number, number][];
  hide: [number, number];
  rim: number;
  step: number;
  mood: 'open' | 'bolt' | 'hide' | 'peek' | 'creep';
  wait?: Phaser.Time.TimerEvent;
};

/** Pack [0..1] RGB channels into a Phaser hex tint. */
const rgb = (r: number, g: number, b: number) =>
  (Phaser.Math.Clamp(Math.round(r * 255), 0, 255) << 16) |
  (Phaser.Math.Clamp(Math.round(g * 255), 0, 255) << 8) |
  Phaser.Math.Clamp(Math.round(b * 255), 0, 255);

/** 4-corner tint in screen space (swaps left/right when flipX negates scaleX). */
const tintQuad = (img: Phaser.GameObjects.Image, tl: number, tr: number, bl: number, br: number) =>
  img.flipX ? img.setTint(tr, tl, br, bl) : img.setTint(tl, tr, bl, br);

/** Visitors on the 15-minute clock. */
const BEATS: { sec: number; who: ChristmasWho }[] = [
  { sec: 60, who: 'sleigh' },
  { sec: 210, who: 'rudolph' },
  { sec: 360, who: 'train' },
  { sec: 435, who: 'chimney' },
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
  private motes: {
    sprite: Phaser.GameObjects.Image;
    x0: number;
    y0: number;
    ampX: number;
    ampY: number;
    speed: number;
    phase: number;
    maxAlpha: number;
  }[] = [];
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

  private runners: Record<ChristmasWho, () => void> = {
    sleigh: () => {},
    rudolph: () => {},
    grinch: () => {},
    train: () => {},
    chimney: () => {},
  };
  private fireLevel = 1;
  private fx = { fire: 0.85, flash: 0, lampX: 0, lampY: 0, lamp: 0 };
  private lit: Record<string, Phaser.GameObjects.Image> = {};
  private trainCars: Phaser.GameObjects.Image[] = [];
  private setFire: (level: number, dur: number) => void = () => {};

  constructor() {
    super('Christmas2026');
  }

  preload(): void {
    for (const [key, url] of IMAGES) this.load.image(key, url);
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.sx = PLATE_W / SRC_W;
    this.sy = PLATE_H / SRC_H;
    const { sx, sy } = this;

    for (const [key] of IMAGES) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.makeTextures();

    // Full-plate layers: sky/snow -> cabin -> hearth mask -> train track -> foreground -> bed -> vignette.
    for (const [key, depth] of [
      ['outside', 0],
      ['cabin-interior', 1.8],
      ['hearth-frame', 2.15],
      ['track', 2.3],
      ['cabin-foreground', 3.5],
      ['bed', 3.6],
      ['xmas-vignette', 4.8],
    ] as const) {
      this.lit[key] = this.add.image(0, 0, key).setOrigin(0).setDisplaySize(PLATE_W, PLATE_H).setDepth(depth);
    }

    // Soft cool shadow that fades in over the hearth/right floor/bed when the fireplace goes out.
    this.lit.hearthOff = this.add
      .image(1110 * sx, 600 * sy, 'xmas-shadow')
      .setTint(0x0a0e1e)
      .setDisplaySize(1080 * sx, 740 * sy)
      .setDepth(3.62)
      .setAlpha(0);

    // Window corner frost & faint glass reflection (masked by cabin-interior at depth 1.8).
    this.add
      .image(OUTSIDE.x0 * sx, OUTSIDE.y0 * sy, 'xmas-window-frost')
      .setOrigin(0)
      .setDisplaySize((OUTSIDE.x1 - OUTSIDE.x0) * sx, (OUTSIDE.y1 - OUTSIDE.y0) * sy)
      .setDepth(1.7);

    this.lightSky(sx, sy);
    this.spawnSnow();
    this.lightTree(sx, sy);
    this.lightCandles(sx, sy);
    this.lightHearth(sx, sy);
    this.spawnMotes(sx, sy);

    // Ace curled up on bed.png (depth 3.7) with bed contact shadow, gentle breathing, and floating Zzz.
    this.lit.aceShadow = this.add.image(0, 0, 'xmas-shadow').setTint(0x08050c).setDepth(3.66);
    const ace = this.add.image(BED.x * sx, BED.y * sy, 'ace').setOrigin(0.5, 0.78).setScale(ACE_SCALE).setDepth(3.7);
    this.lit.ace = ace;
    this.pulse(ace, { scaleY: ACE_SCALE * 1.035 }, 1600);
    this.snout = {
      x: ace.x + (0.38 - 0.5) * ace.width * ACE_SCALE,
      y: ace.y - 0.78 * ace.height * ACE_SCALE,
    };
    const zFont = Math.round((12 * PLATE_H) / 270);
    for (let i = 0; i < 3; i++) {
      const g = this.add
        .text(0, 0, 'z', {
          fontFamily: 'monospace',
          fontSize: `${zFont}px`,
          color: '#d8cfb8',
          stroke: '#241b14',
          strokeThickness: Math.max(1, Math.round((2 * PLATE_H) / 270)),
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.zzz.push({ g, t: i / 3 });
    }

    this.spawnElves(sx, sy);
    this.setupSleigh(sx, sy);
    this.setupRudolph();
    this.setupGrinch(sx, sy);
    this.setupTrain(sx, sy);
    this.setupChimney(sx, sy);
    this.updateLighting(0);

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
      play: (who) => this.runners[who](),
      elf: () => this.nextElf(),
      setHud: (on) => this.clock.setVisible(on),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.editor?.destroy());
  }

  /** Additive glow sprite positioned & sized in source pixels. */
  private glow(
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    alpha: number,
    key = 'xmas-light',
    tint?: number,
  ): Phaser.GameObjects.Image {
    const img = this.add
      .image(x * this.sx, y * this.sy, key)
      .setDisplaySize(w * this.sx, h * this.sy)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .setAlpha(alpha);
    return tint !== undefined ? img.setTint(tint) : img;
  }

  /** Infinite Sine.easeInOut yoyo tween helper. */
  private pulse(targets: object, props: Record<string, unknown>, duration: number, delay = 0): Phaser.Tweens.Tween {
    return this.tweens.add({ targets, ...props, duration, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
          g.fillStyle(palette[ch], 1).fillRect(x * cell, y * cell, cell, cell);
        }
      });
      g.generateTexture(key, rows[0].length * cell, rows.length * cell);
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    drawGrid('xmas-flake', ['.w.', 'www', '.w.'], { w: 0xf4f8ff });
    drawGrid('xmas-steam', ['..ww..', '.wwww.', 'wwwwww', '.wwww.', '..ww..'], { w: 0xf4f0e8 });
    drawGrid(
      'xmas-sparkle',
      ['...y...', '...y...', '..yyy..', 'yyyyyyy', '..yyy..', '...y...', '...y...'],
      { y: 0xffe878 },
    );
    drawGrid('xmas-candle', ['.y.', 'ywy', 'ywy', 'oyo', '.o.'], { w: 0xffffe8, y: 0xffe468, o: 0xff9428 });
    g.destroy();

    const canvasTex = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h);
      if (!tex) return;
      draw(tex.getContext());
      tex.refresh();
    };

    const makeRadial = (key: string, size: number, stops: [number, string][]) =>
      canvasTex(key, size, size, (ctx) => {
        const half = size / 2;
        const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        for (const [stop, color] of stops) grad.addColorStop(stop, color);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      });

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
    makeRadial('xmas-shadow', 64, [
      [0, 'rgba(255, 255, 255, 0.86)'],
      [0.5, 'rgba(255, 255, 255, 0.52)'],
      [0.8, 'rgba(255, 255, 255, 0.16)'],
      [1, 'rgba(255, 255, 255, 0)'],
    ]);

    canvasTex('xmas-aurora', 256, 128, (ctx) => {
      for (let i = 0; i < 36; i++) {
        const t = i / 35;
        const x = 16 + t * 224;
        const env = Math.sin(t * Math.PI);
        const wave = Math.sin(t * Math.PI * 2.5) * 14;
        const baseY = 92 + wave;
        const topY = 10 + wave * 0.4;
        const grad = ctx.createLinearGradient(x, topY, x, baseY + 18);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.55, `rgba(255, 255, 255, ${(0.28 * env).toFixed(3)})`);
        grad.addColorStop(0.84, `rgba(255, 255, 255, ${(0.72 * env).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 6, topY, 12, baseY + 18 - topY);
      }
    });

    // Perspective-matched icy frost along the 3 bay window quads.
    const s = 0.5;
    canvasTex('xmas-window-frost', Math.round((OUTSIDE.x1 - OUTSIDE.x0) * s), Math.round((OUTSIDE.y1 - OUTSIDE.y0) * s), (ctx) => {
      const pt = (px: number, py: number): [number, number] => [(px - OUTSIDE.x0) * s, (py - OUTSIDE.y0) * s];
      const corner = (cx: number, cy: number, r: number, a: number) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(218, 240, 255, ${a})`);
        grad.addColorStop(0.45, `rgba(172, 214, 248, ${a * 0.42})`);
        grad.addColorStop(1, 'rgba(150, 200, 245, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      const clipQuad = (q: [number, number][], fn: () => void) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
        ctx.closePath();
        ctx.clip();
        fn();
        ctx.restore();
      };

      clipQuad([pt(378, 64), pt(498, 86), pt(498, 431), pt(378, 442)], () => {
        corner(...pt(378, 64), 26, 0.24);
        corner(...pt(378, 442), 26, 0.24);
      });
      clipQuad([pt(876, 84), pt(995, 64), pt(995, 442), pt(876, 431)], () => {
        corner(...pt(995, 64), 26, 0.24);
        corner(...pt(995, 442), 26, 0.24);
      });
      const [ctl, ctr, cbr, cbl] = [pt(537, 91), pt(837, 91), pt(837, 426), pt(537, 426)];
      clipQuad([ctl, ctr, cbr, cbl], () => {
        corner(ctl[0], ctl[1], 30, 0.3);
        corner(ctr[0], ctr[1], 30, 0.3);
        corner(cbl[0], cbl[1], 34, 0.36);
        corner(cbr[0], cbr[1], 34, 0.36);
        const sill = ctx.createLinearGradient(0, cbl[1], 0, cbl[1] - 14);
        sill.addColorStop(0, 'rgba(214, 238, 255, 0.22)');
        sill.addColorStop(1, 'rgba(180, 220, 255, 0)');
        ctx.fillStyle = sill;
        ctx.fillRect(ctl[0], cbl[1] - 14, ctr[0] - ctl[0], 14);
        ctx.rotate(-0.36);
        ctx.fillStyle = 'rgba(225, 242, 255, 0.045)';
        ctx.fillRect(62, 66, 18, 180);
        ctx.fillStyle = 'rgba(255, 228, 185, 0.03)';
        ctx.fillRect(92, 66, 9, 180);
      });
    });

    canvasTex('xmas-vignette', 256, 144, (ctx) => {
      ctx.save();
      ctx.translate(128, 72);
      ctx.scale(1, 144 / 256);
      const grad = ctx.createRadialGradient(0, 0, 256 * 0.26, 0, 0, 256 * 0.62);
      grad.addColorStop(0, 'rgba(6, 10, 26, 0)');
      grad.addColorStop(0.65, 'rgba(6, 10, 26, 0.14)');
      grad.addColorStop(1, 'rgba(6, 10, 26, 0.48)');
      ctx.fillStyle = grad;
      ctx.fillRect(-256, -256, 512, 512);
      ctx.restore();
    });
  }

  /** Northern lights, twinkling stars, silver-blue moonlight pools, and occasional shooting stars. */
  private lightSky(sx: number, sy: number): void {
    for (const a of [
      { x: 475, y: 176, w: 330, h: 165, angle: -11, tint: 0x38ffaa, a0: 0.2, a1: 0.42, dx: 22, dy: -10, dur: 7400 },
      { x: 555, y: 164, w: 290, h: 150, angle: -7, tint: 0x44d8ff, a0: 0.16, a1: 0.36, dx: -18, dy: 8, dur: 8800 },
      { x: 510, y: 146, w: 270, h: 135, angle: -9, tint: 0xb470ff, a0: 0.12, a1: 0.28, dx: 16, dy: -7, dur: 10200 },
    ]) {
      const ribbon = this.glow(a.x, a.y, a.w, a.h, 0.35, a.a0, 'xmas-aurora', a.tint).setAngle(a.angle);
      this.pulse(ribbon, { x: (a.x + a.dx) * sx, y: (a.y + a.dy) * sy, displayHeight: a.h * 1.14 * sy, alpha: a.a1 }, a.dur);
    }

    SKY_STARS.forEach(([x, y], i) => {
      const star = this.add
        .rectangle(x * sx, y * sy, 2 * sx, 2 * sy, i % 3 === 0 ? 0xd8ecff : 0xfff8dc, 0.25)
        .setDepth(0.5);
      this.pulse(star, { alpha: 0.95, scaleX: 1.4, scaleY: 1.4 }, 1100 + (i % 5) * 340, (i * 270) % 1800);
    });

    for (const p of [
      { x: 750, y: 148, w: 280, h: 280, depth: 0.4, a0: 0.34, a1: 0.5, dur: 3800 },
      { x: 688, y: 454, w: 580, h: 220, depth: 2.0, a0: 0.24, a1: 0.34, dur: 4200 },
      { x: 688, y: 575, w: 480, h: 210, depth: 3.8, a0: 0.1, a1: 0.16, dur: 4600 },
    ]) {
      this.pulse(this.glow(p.x, p.y, p.w, p.h, p.depth, p.a0, 'xmas-moonlight'), { alpha: p.a1 }, p.dur);
    }

    this.time.addEvent({
      delay: 28_000,
      loop: true,
      callback: () => {
        const x0 = Phaser.Math.Between(560, 720);
        const y0 = Phaser.Math.Between(102, 152);
        const streak = this.add.rectangle(x0 * sx, y0 * sy, 24 * sx, 2 * sy, 0xeef6ff, 0).setAngle(22).setDepth(0.6);
        this.tweens.add({
          targets: streak,
          x: (x0 + 110) * sx,
          y: (y0 + 44) * sy,
          alpha: { from: 0.9, to: 0 },
          duration: 620,
          ease: 'Quad.easeOut',
          onComplete: () => streak.destroy(),
        });
      },
    });
  }

  private lightCandles(sx: number, sy: number): void {
    CANDLES.forEach((c, i) => {
      const outer = this.glow(c.x, c.y - 8, 165 * c.s, 165 * c.s, 2.22, 0.46);
      this.pulse(outer, { alpha: 0.72, displayWidth: 165 * c.s * 1.12 * sx, displayHeight: 165 * c.s * 1.12 * sy }, 460 + i * 130);

      const inner = this.glow(c.x, c.y - 6, 52 * c.s, 52 * c.s, 2.24, 0.55, 'xmas-bulb', 0xffd478);
      this.pulse(inner, { alpha: 0.85, displayWidth: 52 * c.s * 1.16 * sx, displayHeight: 52 * c.s * 1.16 * sy }, 240 + i * 80);

      const flame = this.add.image(c.x * sx, c.y * sy, 'xmas-candle').setOrigin(0.5, 1).setScale(sx * c.s).setDepth(2.26);
      this.pulse(flame, { scaleX: sx * c.s * 0.85, scaleY: sx * c.s * 1.22, angle: i === 0 ? 5 : -5 }, 180 + i * 55);
    });
  }

  private spawnSnow(): void {
    for (let i = 0; i < SNOW_COUNT; i++) {
      const sprite = this.add.image(0, 0, 'xmas-flake').setDepth(1).setAlpha(0.85).setScale(1.2 + (i % 3) * 0.45);
      this.snow.push({ sprite, speed: 14 + (i % 5) * 3, phase: i * 1.7 });
      this.resetFlake(i, true);
    }
  }

  private resetFlake(i: number, settled: boolean): void {
    const px = OUTSIDE.x0 + Math.random() * (OUTSIDE.x1 - OUTSIDE.x0);
    const py = settled ? OUTSIDE.y0 + Math.random() * (OUTSIDE.y1 - OUTSIDE.y0) : OUTSIDE.y0 - Math.random() * 12;
    this.snow[i].sprite.setPosition(px * this.sx, py * this.sy);
  }

  private spawnMotes(sx: number, sy: number): void {
    const specs: [number, number, number, number][] = [
      [520, 470, 0xd4ecff, 7], [590, 510, 0xe6f4ff, 6], [640, 458, 0xcce6ff, 8],
      [695, 535, 0xeaf6ff, 7], [745, 482, 0xd4ecff, 6], [805, 520, 0xcce6ff, 7],
      [625, 590, 0xe2f2ff, 6], [755, 575, 0xd8eeff, 8], [680, 630, 0xeaf6ff, 6],
      [265, 410, 0xffe4a0, 7], [335, 495, 0xffd888, 6], [955, 560, 0xffe098, 7],
      [1030, 515, 0xffd47a, 8], [1095, 590, 0xffe6a8, 6],
    ];
    this.motes = specs.map(([x, y, tint, size], i) => ({
      sprite: this.glow(x, y, size, size, 3.9, 0, 'xmas-bulb', tint),
      x0: x * sx,
      y0: y * sy,
      ampX: (8 + (i % 4) * 4) * sx,
      ampY: (10 + (i % 3) * 5) * sy,
      speed: 0.32 + (i % 5) * 0.08,
      phase: i * 1.37,
      maxAlpha: 0.24 + (i % 3) * 0.07,
    }));
  }

  /** Warm tree glow, twinkling star topper, and all 81 fairy-light bulbs. */
  private lightTree(sx: number, sy: number): void {
    this.pulse(this.glow(170, 320, 540, 640, 1.95, 0.32), { alpha: 0.44 }, 2400);
    this.pulse(this.glow(185, 585, 480, 250, 3.8, 0.28), { alpha: 0.38 }, 2800);

    const starHalo = this.glow(TREE_STAR.x, TREE_STAR.y, 148, 148, 2.02, 0.45);
    this.pulse(starHalo, { alpha: 0.9, displayWidth: 148 * 1.18 * sx, displayHeight: 148 * 1.18 * sy }, 1350);

    const starSprite = this.add
      .image(TREE_STAR.x * sx, TREE_STAR.y * sy, 'star')
      .setScale(sx * 0.96, sy * 0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.05)
      .setAlpha(0.35);
    this.pulse(starSprite, { alpha: 1, scaleX: sx * 1.06, scaleY: sy * 1.06 }, 1350);

    const starGlint = this.add
      .image(TREE_STAR.x * sx, (TREE_STAR.y + 2) * sy, 'xmas-sparkle')
      .setScale(sx * 1.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.08)
      .setAlpha(0.12);
    this.pulse(starGlint, { alpha: 0.92, scaleX: sx * 1.75, scaleY: sy * 1.75, angle: 45 }, 980);

    const tints = [0xfff4c2, 0xffe28a, 0xffd26a, 0xfff9dc, 0xffbe60];
    TREE_LIGHTS.forEach(([lx, ly], i) => {
      const maxW = (17 + (i % 3) * 2) * sx;
      const bulb = this.glow(lx, ly, 10, 10, 2.04, 0.08, 'xmas-bulb', tints[i % tints.length]);
      this.pulse(bulb, { alpha: 0.96, displayWidth: maxW, displayHeight: maxW }, 620 + (i % 7) * 160, (i * 173) % 1450);
    });
  }

  /** Animated fireplace using layered pixel-art fire.png masked behind hearth-frame.png. */
  private lightHearth(sx: number, sy: number): void {
    const flickers: {
      sprite: Phaser.GameObjects.Image;
      base: number;
      span: number;
      w?: number;
      h?: number;
      driftX?: number;
    }[] = [
      { sprite: this.glow(1230, 474, 270, 280, 1.95, 0.88, 'xmas-light', 0xff9428), base: 0.72, span: 0.28, w: 270, h: 280 },
      { sprite: this.glow(1140, 600, 660, 420, 3.8, 0.46), base: 0.34, span: 0.22, w: 660, h: 420 },
      { sprite: this.glow(910, 668, 800, 350, 3.8, 0.34), base: 0.22, span: 0.2, w: 800, h: 350, driftX: 910 },
      { sprite: this.glow(1185, 395, 400, 340, 2.2, 0.28), base: 0.18, span: 0.16 },
      { sprite: this.glow(1244, 546, 164, 74, 1.98, 0.92, 'xmas-light', 0xff7218).setAngle(24), base: 0.76, span: 0.24 },
      { sprite: this.glow(1246, 540, 136, 52, 1.99, 0.82, 'xmas-light', 0xffc648).setAngle(22), base: 0.64, span: 0.28 },
    ];
    const coalSpots = [
      [1206, 526, 26, 0xff8224], [1224, 536, 30, 0xffae38], [1242, 544, 34, 0xffce54],
      [1260, 552, 32, 0xffa430], [1276, 560, 28, 0xff7c22], [1248, 556, 28, 0xff6a1a],
    ].map(([x, y, s, tint]) => this.glow(x, y, s, s * 0.65, 2.0, 0.82, 'xmas-bulb', tint).setAngle(24));

    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const intensity = Phaser.Math.FloatBetween(0.4, 1.0);
        const reach = 0.97 + intensity * 0.06;
        const lv = this.fireLevel;
        this.tweens.add({ targets: this.fx, fire: 0.72 + intensity * 0.38, duration: 360, ease: 'Sine.easeInOut' });
        for (const f of flickers) {
          const props: Record<string, number> = { alpha: (f.base + intensity * f.span) * lv };
          if (f.w && f.h) {
            props.displayWidth = f.w * sx * reach;
            props.displayHeight = f.h * sy * reach;
          }
          if (f.driftX !== undefined) props.x = (f.driftX - intensity * 8) * sx;
          this.tweens.add({ targets: f.sprite, ...props, duration: 360, ease: 'Sine.easeInOut' });
        }
        for (const spot of coalSpots) {
          this.tweens.add({
            targets: spot,
            alpha: Phaser.Math.FloatBetween(0.6, 0.98) * lv,
            duration: 360,
            ease: 'Sine.easeInOut',
          });
        }
      },
    });

    // Cohesive 3-layer pixel-art hearth flame anchored on the logs (clipped behind hearth-frame at 2.15).
    const fireGroup = this.add.container(1248 * sx, 566 * sy).setDepth(2.03);
    for (const c of [
      { dx: -8, dy: -4, sx0: 1.08, sy0: 0.94, sy1: 1.06, flip: false, a0: -2.5, a1: 2, dur: 460, alpha: 0.86, tint: 0xff9838, add: false },
      { dx: 0, dy: 0, sx0: 1.0, sy0: 1.0, sy1: 1.12, flip: false, a0: -1.8, a1: 2.2, dur: 330, alpha: 0.96, tint: 0xffffff, add: false },
      { dx: 4, dy: 2, sx0: 0.74, sy0: 0.78, sy1: 0.92, flip: true, a0: 2, a1: -2.4, dur: 245, alpha: 0.54, tint: 0xfff0b8, add: true },
    ]) {
      const f = this.add
        .image(c.dx * sx, c.dy * sy, 'fire')
        .setOrigin(0.5, 1)
        .setFlipX(c.flip)
        .setScale(sx * c.sx0, sy * c.sy0)
        .setTint(c.tint)
        .setAlpha(c.alpha)
        .setAngle(c.a0);
      if (c.add) f.setBlendMode(Phaser.BlendModes.ADD);
      fireGroup.add(f);
      this.pulse(f, { scaleX: sx * c.sx0 * 0.96, scaleY: sy * c.sy1, angle: c.a1 }, c.dur);
    }

    this.setFire = (level, dur) => {
      this.tweens.killTweensOf(fireGroup);
      this.tweens.add({ targets: this, fireLevel: level, duration: dur, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: fireGroup,
        alpha: level,
        scaleY: 0.15 + 0.85 * level,
        duration: dur,
        ease: level > 0.5 ? 'Back.easeOut' : 'Sine.easeInOut',
      });
    };

    this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        if (this.fireLevel < 0.3) return;
        const ember = this.add
          .rectangle(Phaser.Math.Between(1204, 1276) * sx, 490 * sy, 3 * sx, 3 * sy, 0xffe078, 0.78)
          .setDepth(2.1);
        this.tweens.add({
          targets: ember,
          x: ember.x + Phaser.Math.Between(-10, 10) * sx,
          y: ember.y - Phaser.Math.Between(42, 78) * sy,
          alpha: 0,
          duration: Phaser.Math.Between(1200, 1900),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy(),
        });
      },
    });
  }

  private spawnElves(sx: number, sy: number): void {
    this.elves = ELVES_CFG.map((cfg) => ({
      sprite: this.add.image(cfg.hide[0] * sx, cfg.hide[1] * sy, cfg.key).setOrigin(0.5, 1).setDepth(3.0).setScale(sx * ELF_SCALE),
      shadow: this.add.image(0, 0, 'xmas-shadow').setTint(0x08050c).setVisible(false),
      points: cfg.points,
      hide: cfg.hide,
      rim: cfg.rim,
      step: cfg.points.length - 1,
      mood: 'hide',
    }));
    this.nextElf();
    this.time.addEvent({ delay: ELF_GAP, loop: true, callback: () => this.nextElf() });
  }

  private quietElves(): void {
    this.elfHolds++;
    for (const elf of this.elves) this.tuckElf(elf);
  }

  private freeElves(): void {
    if (this.elfHolds > 0 && --this.elfHolds === 0 && this.elfDue) this.nextElf();
  }

  private nextElf(): void {
    if (this.elfHolds > 0) {
      this.elfDue = true;
      return;
    }
    this.elfDue = false;
    this.creepElf(this.elves[this.elfTurn++ % this.elves.length]);
  }

  private hopBehind(elf: Elf, upDur: number, downDur: number, onComplete?: () => void): void {
    this.tweens.add({
      targets: elf.sprite,
      x: elf.hide[0] * this.sx,
      y: (elf.rim + 18) * this.sy,
      duration: upDur,
      ease: 'Quad.easeOut',
      onComplete: () => {
        elf.sprite.setDepth(3.0);
        this.tweens.add({
          targets: elf.sprite,
          y: elf.hide[1] * this.sy,
          duration: downDur,
          ease: 'Quad.easeIn',
          onComplete,
        });
      },
    });
  }

  private tuckElf(elf: Elf): void {
    if (elf.mood === 'hide') return;
    elf.mood = 'hide';
    elf.wait?.remove(false);
    elf.wait = undefined;
    this.tweens.killTweensOf(elf.sprite);
    elf.sprite.setScale(this.sx * ELF_SCALE).setAngle(0);
    if (elf.sprite.depth > 3.1) this.hopBehind(elf, 220, 160);
    else {
      elf.sprite.setDepth(3.0);
      this.tweens.add({ targets: elf.sprite, x: elf.hide[0] * this.sx, y: elf.hide[1] * this.sy, duration: 240, ease: 'Quad.easeIn' });
    }
  }

  private waitElf(elf: Elf): void {
    elf.mood = 'open';
    const { sx, sy } = this;
    const baseY = elf.sprite.y;
    const lookRight = elf.sprite.x < BED.x * sx;
    elf.sprite.setFlipX(!lookRight).setAngle(0);
    this.tweens.add({
      targets: elf.sprite,
      angle: lookRight ? 4 : -4,
      duration: 450,
      yoyo: true,
      hold: 450,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (elf.mood !== 'open') return;
        elf.sprite.setFlipX(lookRight);
        this.time.delayedCall(750, () => {
          if (elf.mood !== 'open') return;
          elf.sprite.setFlipX(!lookRight);
          const star = this.add
            .image(elf.sprite.x, baseY - 68 * sy, 'xmas-sparkle')
            .setScale(sx * 0.65)
            .setAlpha(0.95)
            .setDepth(elf.sprite.depth + 0.05);
          this.tweens.add({ targets: star, y: star.y - 20 * sy, angle: 45, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => star.destroy() });
          this.tweens.add({ targets: elf.sprite, y: baseY - 6 * sy, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
        });
      },
    });
    elf.wait = this.time.delayedCall(Phaser.Math.Between(3400, 4600), () => {
      elf.wait = undefined;
      if (elf.mood !== 'open') return;
      elf.mood = 'bolt';
      this.tweens.killTweensOf(elf.sprite);
      elf.sprite.setScale(sx * ELF_SCALE);
      this.hopBehind(elf, 280, 180, () => this.hideElf(elf));
    });
  }

  private hideElf(elf: Elf): void {
    elf.mood = 'hide';
    elf.sprite.setDepth(3.0);
    if (this.elfHolds > 0) return;
    this.time.delayedCall(Phaser.Math.Between(1400, 2400), () => {
      if (this.elfHolds > 0 || elf.mood !== 'hide') return;
      elf.mood = 'peek';
      elf.sprite.setDepth(3.0).setAngle(0).setFlipX(elf.hide[0] > BED.x);
      this.tweens.add({
        targets: elf.sprite,
        x: elf.hide[0] * this.sx,
        y: (elf.rim + ELF_SRC_H - PEEK) * this.sy,
        duration: Phaser.Math.Between(280, 420),
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (this.elfHolds > 0) return this.tuckElf(elf);
          this.time.delayedCall(Phaser.Math.Between(850, 1250), () => {
            if (this.elfHolds > 0) return this.tuckElf(elf);
            elf.mood = 'hide';
            this.tweens.add({
              targets: elf.sprite,
              x: elf.hide[0] * this.sx,
              y: elf.hide[1] * this.sy,
              duration: Phaser.Math.Between(140, 200),
              ease: 'Quad.easeIn',
              onComplete: () => {
                if (elf.step === elf.points.length - 1 || this.elfHolds > 0) return;
                this.time.delayedCall(Phaser.Math.Between(400, 800), () => this.creepElf(elf));
              },
            });
          });
        },
      });
    });
  }

  private creepElf(elf: Elf): void {
    if (this.elfHolds > 0) return;
    elf.mood = 'creep';
    elf.step = (elf.step + 1) % elf.points.length;
    const [nx, ny] = elf.points[elf.step];
    elf.sprite
      .setScale(this.sx * ELF_SCALE)
      .setAngle(0)
      .setFlipX(nx * this.sx < elf.sprite.x)
      .setDepth(3.0)
      .setPosition(elf.hide[0] * this.sx, elf.hide[1] * this.sy);
    this.tweens.add({
      targets: elf.sprite,
      y: (elf.rim + 18) * this.sy,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.elfHolds > 0) return this.tuckElf(elf);
        elf.sprite.setDepth(3.55);
        this.tweens.add({
          targets: elf.sprite,
          x: nx * this.sx,
          y: ny * this.sy,
          duration: 380,
          ease: 'Quad.easeIn',
          onComplete: () => this.waitElf(elf),
        });
      },
    });
  }

  /** Beat 1: Distant Santa sleigh with 6-frame galloping reindeer crossing the moon. */
  private setupSleigh(sx: number, sy: number): void {
    const sprite = this.add.image(SLEIGH.x0 * sx, SLEIGH.y0 * sy, 'sleigh-0').setScale(sx * SLEIGH.scale).setDepth(1.2).setVisible(false);
    let gallop: Phaser.Time.TimerEvent | undefined;
    let sparkles: Phaser.Time.TimerEvent | undefined;

    this.runners.sleigh = () => {
      this.tweens.killTweensOf(sprite);
      gallop?.remove(false);
      sparkles?.remove(false);
      let frame = 0;
      sprite.setVisible(true).setTexture('sleigh-0').setAlpha(0.92).setPosition(SLEIGH.x0 * sx, SLEIGH.y0 * sy).setAngle(-2);

      gallop = this.time.addEvent({
        delay: 90,
        loop: true,
        callback: () => sprite.setTexture(`sleigh-${(frame = (frame + 1) % 6)}`),
      });
      const dustTints = [0xffe878, 0xfff6cc, 0xd8f0ff];
      sparkles = this.time.addEvent({
        delay: 150,
        loop: true,
        callback: () => {
          if (!sprite.visible) return;
          const mote = this.add
            .image(sprite.x - Phaser.Math.Between(35, 42) * sx, sprite.y + Phaser.Math.Between(2, 8) * sy, 'xmas-sparkle')
            .setTint(Phaser.Math.RND.pick(dustTints))
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(sx * Phaser.Math.FloatBetween(0.14, 0.25))
            .setAlpha(Phaser.Math.FloatBetween(0.32, 0.52))
            .setDepth(1.15);
          this.tweens.add({
            targets: mote,
            x: mote.x - Phaser.Math.Between(12, 26) * sx,
            y: mote.y + Phaser.Math.Between(5, 14) * sy,
            angle: Phaser.Math.Between(-45, 45),
            scale: sx * 0.08,
            alpha: 0,
            duration: Phaser.Math.Between(850, 1300),
            ease: 'Sine.easeOut',
            onComplete: () => mote.destroy(),
          });
        },
      });
      this.pulse(sprite, { angle: 2 }, 900);
      this.tweens.add({
        targets: sprite,
        x: SLEIGH.x1 * sx,
        y: SLEIGH.y1 * sy,
        duration: SLEIGH.ms,
        onComplete: () => {
          gallop?.remove(false);
          sparkles?.remove(false);
          this.tweens.killTweensOf(sprite);
          sprite.setVisible(false);
        },
      });
    };
  }

  /** Shared walk-in -> hold -> walk-out visitor outside the bay window (Rudolph & Grinch). */
  private setupWindowVisitor(cfg: {
    who: 'rudolph' | 'grinch';
    key: string;
    x0: number;
    x1: number;
    y: number;
    scale: number;
    walk: number;
    hold: number;
    bobY: number;
    bobAng: number;
    bobDur: number;
    flipIn: boolean;
    onStart?: () => void;
    onArrive?: (body: Phaser.GameObjects.Image) => void;
    onDone?: () => void;
  }): void {
    const { sx, sy } = this;
    const body = this.add.image(cfg.x0 * sx, cfg.y * sy, cfg.key).setOrigin(0.5, 1).setScale(sx * cfg.scale).setDepth(1.5).setVisible(false);
    this.lit[cfg.who] = body;
    let holdTimer: Phaser.Time.TimerEvent | undefined;

    this.runners[cfg.who] = () => {
      holdTimer?.remove(false);
      cfg.onStart?.();
      this.tweens.killTweensOf(body);
      body.setVisible(true).setFlipX(cfg.flipIn).setAngle(-cfg.bobAng).setPosition(cfg.x0 * sx, cfg.y * sy);
      const bob = this.pulse(body, { y: (cfg.y - cfg.bobY) * sy, angle: cfg.bobAng }, cfg.bobDur);
      this.tweens.add({
        targets: body,
        x: cfg.x1 * sx,
        duration: cfg.walk,
        ease: 'Sine.easeOut',
        onComplete: () => {
          bob.stop();
          body.setY(cfg.y * sy).setAngle(0);
          cfg.onArrive?.(body);
          holdTimer = this.time.delayedCall(cfg.hold, () => {
            this.tweens.killTweensOf(body);
            body.setFlipX(!cfg.flipIn).setAngle(cfg.bobAng);
            this.pulse(body, { y: (cfg.y - cfg.bobY) * sy, angle: -cfg.bobAng }, cfg.bobDur);
            this.tweens.add({
              targets: body,
              x: cfg.x0 * sx,
              duration: cfg.walk,
              ease: 'Sine.easeIn',
              onComplete: () => {
                this.tweens.killTweensOf(body);
                body.setVisible(false);
                cfg.onDone?.();
              },
            });
          });
        },
      });
    };
  }

  private setupRudolph(): void {
    this.setupWindowVisitor({
      who: 'rudolph',
      key: 'rudolph',
      x0: 1060,
      x1: 758,
      y: 488,
      scale: 0.72,
      walk: 2600,
      hold: 4500,
      bobY: 5,
      bobAng: 1.5,
      bobDur: 240,
      flipIn: false,
    });
  }

  private setupGrinch(_sx: number, _sy: number): void {
    this.setupWindowVisitor({
      who: 'grinch',
      key: 'grinch',
      x0: 310,
      x1: 604,
      y: 482,
      scale: 0.72,
      walk: 2400,
      hold: 4200,
      bobY: 6,
      bobAng: 3,
      bobDur: 280,
      flipIn: true,
      onStart: () => this.quietElves(),
      onArrive: (body) => this.pulse(body, { angle: 4 }, 900),
      onDone: () => this.freeElves(),
    });
  }

  /** Beat 4: 3-car miniature steam train loops around Ace's bed on track.png. */
  private setupTrain(sx: number, sy: number): void {
    const carDefs = ['train', 'car1', 'car2'].map((k) => ({ side: k, up: `${k}-up`, down: `${k}-down` }));
    const cars = carDefs.map((d) =>
      this.add.image(TRAIN.xStart * sx, TRAIN.yFront * sy, d.side).setOrigin(0.5, 1).setScale(sx * TRAIN.scale).setDepth(4.2).setVisible(false),
    );
    this.trainCars = cars;
    const lampBulb = this.glow(0, 0, 24, 24, 4.26, 0.92, 'xmas-bulb', 0xfff4c2).setVisible(false);
    const lampBeam = this.glow(0, 0, 160, 76, 4.24, 0.45).setVisible(false);

    const R = 32;
    const ARC = (Math.PI / 2) * R;
    const S0 = TRAIN.xRight - R - TRAIN.xStart;
    const S1 = TRAIN.yFront - R - (TRAIN.yBack + R);
    const S2 = TRAIN.xRight - R - (TRAIN.xLeft + R);
    const S4 = TRAIN.xLeft - R - TRAIN.xStart;
    const totalLen = S0 + ARC + S1 + ARC + S2 + ARC + S1 + ARC + S4;
    const maxDist = totalLen + (cars.length - 1) * TRAIN.carGap;

    const poseAt = (d: number): { x: number; y: number; dir: 'right' | 'up' | 'left' | 'down'; back: boolean } | null => {
      if (d < 0 || d > totalLen) return null;
      let u = d;
      if (u <= S0) return { x: TRAIN.xStart + u, y: TRAIN.yFront, dir: 'right', back: false };
      u -= S0;
      if (u <= ARC) {
        const a = Math.PI / 2 - (u / ARC) * (Math.PI / 2);
        return { x: TRAIN.xRight - R + Math.cos(a) * R, y: TRAIN.yFront - R + Math.sin(a) * R, dir: u < ARC * 0.55 ? 'right' : 'up', back: false };
      }
      u -= ARC;
      if (u <= S1) return { x: TRAIN.xRight, y: TRAIN.yFront - R - u, dir: 'up', back: false };
      u -= S1;
      if (u <= ARC) {
        const a = -(u / ARC) * (Math.PI / 2);
        return { x: TRAIN.xRight - R + Math.cos(a) * R, y: TRAIN.yBack + R + Math.sin(a) * R, dir: u < ARC * 0.45 ? 'up' : 'left', back: u >= ARC * 0.45 };
      }
      u -= ARC;
      if (u <= S2) return { x: TRAIN.xRight - R - u, y: TRAIN.yBack, dir: 'left', back: true };
      u -= S2;
      if (u <= ARC) {
        const a = -Math.PI / 2 - (u / ARC) * (Math.PI / 2);
        return { x: TRAIN.xLeft + R + Math.cos(a) * R, y: TRAIN.yBack + R + Math.sin(a) * R, dir: u < ARC * 0.45 ? 'left' : 'down', back: u < ARC * 0.45 };
      }
      u -= ARC;
      if (u <= S1) return { x: TRAIN.xLeft, y: TRAIN.yBack + R + u, dir: 'down', back: false };
      u -= S1;
      if (u <= ARC) {
        const a = (u / ARC) * (Math.PI / 2);
        return { x: TRAIN.xLeft - R + Math.cos(a) * R, y: TRAIN.yFront - R + Math.sin(a) * R, dir: u < ARC * 0.45 ? 'down' : 'left', back: false };
      }
      u -= ARC;
      return { x: TRAIN.xLeft - R - u, y: TRAIN.yFront, dir: 'left', back: false };
    };

    let steamTimer: Phaser.Time.TimerEvent | undefined;
    let driveTween: Phaser.Tweens.Tween | undefined;
    const hideTrain = () => {
      steamTimer?.remove(false);
      lampBulb.setVisible(false);
      lampBeam.setVisible(false);
      this.fx.lamp = 0;
      cars.forEach((c) => (this.tweens.killTweensOf(c), c.setVisible(false)));
    };

    this.runners.train = () => {
      this.quietElves();
      driveTween?.stop();
      hideTrain();

      const loco = cars[0];
      steamTimer = this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          if (!loco.visible) return;
          const dir = loco.texture.key === 'train' ? (loco.flipX ? -1 : 1) : 0;
          const puff = this.add
            .image(loco.x + dir * 14 * sx, loco.y - 48 * sy, 'xmas-steam')
            .setTint(loco.tintTopLeft)
            .setAlpha(0.82)
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
        duration: TRAIN.ms,
        onUpdate: () => {
          const chug = 1 + Math.sin(this.time.now * 0.025) * 0.028;
          const pulse = 0.92 + Math.sin(this.time.now * 0.015) * 0.08;
          cars.forEach((car, i) => {
            const p = poseAt(state.dist - i * TRAIN.carGap);
            if (!p) {
              car.setVisible(false);
              if (i === 0) lampBulb.setVisible(false), lampBeam.setVisible(false), (this.fx.lamp = 0);
              return;
            }
            const def = carDefs[i];
            const persp = p.back ? 0.9 : 1;
            const depth = p.back ? 3.2 : 4.2 + p.y / 1000;
            car
              .setVisible(true)
              .setTexture(p.dir === 'up' ? def.up : p.dir === 'down' ? def.down : def.side)
              .setFlipX(p.dir === 'left')
              .setScale(sx * TRAIN.scale * persp, sx * TRAIN.scale * persp * chug)
              .setDepth(depth)
              .setPosition(p.x * sx, p.y * sy);

            if (i !== 0) return;
            const sign = p.dir === 'right' ? 1 : -1;
            const beam =
              p.dir === 'up'
                ? { dx: 0, dy: -36, w: 86, h: 64, a: 0.28, d: -0.02 }
                : p.dir === 'down'
                  ? { dx: 0, dy: 18, w: 96, h: 118, a: 0.46, d: 0.01 }
                  : { dx: sign * 74 * persp, dy: -16 * persp, w: 160, h: 72, a: 0.46, d: 0.01 };
            Object.assign(this.fx, { lampX: p.x + beam.dx * 0.7, lampY: p.y + beam.dy - 10, lamp: pulse * (p.back ? 0.72 : 1) });
            lampBeam
              .setVisible(true)
              .setDepth(depth + beam.d)
              .setPosition((p.x + beam.dx) * sx, (p.y + beam.dy) * sy)
              .setDisplaySize(beam.w * sx * persp, beam.h * sy * persp)
              .setAlpha(beam.a * pulse);
            if (p.dir === 'up') {
              lampBulb.setVisible(false);
            } else {
              const bx = p.dir === 'down' ? p.x : p.x + sign * 29 * persp;
              const by = p.dir === 'down' ? p.y - 22 : p.y - 29 * persp;
              const bs = (p.dir === 'down' ? 22 : 24) * persp * pulse;
              lampBulb.setVisible(true).setDepth(depth + 0.03).setPosition(bx * sx, by * sy).setDisplaySize(bs * sx, bs * sy).setAlpha(0.9 * pulse);
            }
          });
        },
        onComplete: () => {
          hideTrain();
          this.freeElves();
        },
      });
    };
  }

  /** Beat 5: Hearth goes out, Santa gets stuck kicking in the chimney, tugs back up, then magic relights the fire. */
  private setupChimney(sx: number, sy: number): void {
    const SANTA_X = 1220 * sx;
    const S = 0.94;
    const scaleX = sx * S;
    const scaleY = sy * S;
    const HIDDEN_Y = 184 * sy;
    const PEEK_Y = 244 * sy;
    const STUCK_Y = 308 * sy;
    const LEG_Y = 74 * scaleY;
    const NIGHT_TINT = 0x9c98aa;

    const part = (x: number, y: number, ox: number, oy: number, cx: number, cy: number, cw: number, ch: number) =>
      this.add
        .image(x, y, 'santa-chimney')
        .setOrigin(ox, oy)
        .setScale(scaleX, scaleY)
        .setTint(NIGHT_TINT)
        .setCrop(cx, cy, cw, ch);

    const legL = part(-20 * scaleX, LEG_Y, 34 / 108, 74 / 160, 0, 70, 54, 90);
    const legR = part(20 * scaleX, LEG_Y, 74 / 108, 74 / 160, 54, 70, 54, 90);
    const torso = part(0, 0, 0.5, 0, 0, 0, 108, 78);
    const santaRig = this.add.container(SANTA_X, HIDDEN_Y, [legL, legR, torso]).setDepth(2.08).setVisible(false);
    const flash = this.glow(1238, 502, 240, 220, 2.11, 0, 'xmas-light', 0xffe082).setVisible(false);

    const dropSoot = (count: number, magic = false) => {
      for (let i = 0; i < count; i++) {
        const px = Phaser.Math.Between(1184, 1264) * sx;
        const p =
          magic && i % 2 === 0
            ? this.add
                .image(px, 354 * sy, 'xmas-sparkle')
                .setTint(0xffe878)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setScale(sx * Phaser.Math.FloatBetween(0.28, 0.46))
                .setAlpha(0.8)
                .setDepth(2.1)
            : this.add.rectangle(px, 354 * sy, 3 * sx, 3 * sy, 0x2a201c, 0.85).setDepth(2.1);
        this.tweens.add({
          targets: p,
          x: p.x + Phaser.Math.Between(-18, 18) * sx,
          y: p.y + Phaser.Math.Between(70, 145) * sy,
          alpha: 0,
          duration: Phaser.Math.Between(750, 1300),
          delay: i * 65,
          ease: 'Quad.easeIn',
          onComplete: () => p.destroy(),
        });
      }
    };

    const smokePuff = () => {
      for (let i = 0; i < 4; i++) {
        const puff = this.add
          .image(Phaser.Math.Between(1214, 1262) * sx, 514 * sy, 'xmas-steam')
          .setTint(0xc8c0b8)
          .setScale(sx * 0.9)
          .setAlpha(0.55)
          .setDepth(2.1);
        this.tweens.add({
          targets: puff,
          x: puff.x + Phaser.Math.Between(-14, 14) * sx,
          y: puff.y - Phaser.Math.Between(42, 76) * sy,
          scale: sx * 2.0,
          alpha: 0,
          duration: Phaser.Math.Between(950, 1400),
          delay: i * 110,
          ease: 'Sine.easeOut',
          onComplete: () => puff.destroy(),
        });
      }
    };

    const resetLegs = () => {
      this.tweens.killTweensOf(legL);
      this.tweens.killTweensOf(legR);
      legL.setAngle(0).setY(LEG_Y);
      legR.setAngle(0).setY(LEG_Y);
    };

    const kickLegs = (degOut: number, dur: number, repeats: number) => {
      resetLegs();
      for (const [leg, outAngle, delay] of [
        [legL, -degOut, 0],
        [legR, degOut, Math.round(dur * 0.5)],
      ] as const) {
        this.tweens.add({
          targets: leg,
          angle: outAngle,
          y: LEG_Y - 5 * sy,
          duration: dur,
          delay,
          yoyo: true,
          repeat: repeats,
          ease: 'Sine.easeInOut',
          onComplete: () => leg.setAngle(0).setY(LEG_Y),
        });
      }
    };

    let timers: Phaser.Time.TimerEvent[] = [];
    const at = (ms: number, fn: () => void) => timers.push(this.time.delayedCall(ms, fn));

    const magicRelight = () => {
      const cx = 1236 * sx;
      const tints = [0xffe878, 0xfff8d6, 0xd8f0ff];
      for (let i = 0; i < 12; i++) {
        const mote = this.add
          .image(cx, 355 * sy, 'xmas-sparkle')
          .setTint(tints[i % tints.length])
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(sx * Phaser.Math.FloatBetween(0.32, 0.54))
          .setAlpha(0)
          .setDepth(2.11);
        const st = { t: 0 };
        const phase = i * 0.85;
        this.tweens.add({
          targets: st,
          t: 1,
          duration: 850,
          delay: i * 55,
          ease: 'Quad.easeIn',
          onUpdate: () => {
            const r = (1 - st.t) * 26 * sx;
            const ang = phase + st.t * Math.PI * 3;
            mote
              .setPosition(cx + Math.cos(ang) * r, (355 + st.t * 158) * sy)
              .setAngle(st.t * 180)
              .setAlpha(st.t < 0.15 ? st.t / 0.15 : 0.92 * (1 - st.t * 0.35));
          },
          onComplete: () => mote.destroy(),
        });
      }

      at(900, () => {
        const star = this.add
          .image(cx, 514 * sy, 'xmas-sparkle')
          .setTint(0xfff4b8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(sx * 0.4)
          .setDepth(2.13);
        this.tweens.add({ targets: star, scale: sx * 2.8, angle: 90, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => star.destroy() });

        flash.setVisible(true).setAlpha(0.95);
        this.tweens.add({ targets: flash, alpha: 0, duration: 750, ease: 'Quad.easeOut', onComplete: () => flash.setVisible(false) });
        this.fx.flash = 1;
        this.tweens.add({ targets: this.fx, flash: 0, duration: 750, ease: 'Quad.easeOut' });
        this.setFire(1, 560);

        for (let i = 0; i < 8; i++) {
          const sp = this.add
            .image(cx + Phaser.Math.Between(-24, 24) * sx, 516 * sy, 'xmas-sparkle')
            .setTint(i % 2 === 0 ? 0xffe878 : 0xfff6d2)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(sx * Phaser.Math.FloatBetween(0.28, 0.48))
            .setAlpha(0.9)
            .setDepth(2.13);
          this.tweens.add({
            targets: sp,
            x: sp.x + Phaser.Math.Between(-16, 16) * sx,
            y: sp.y - Phaser.Math.Between(60, 115) * sy,
            angle: Phaser.Math.Between(-90, 90),
            alpha: 0,
            duration: Phaser.Math.Between(800, 1300),
            delay: i * 50,
            ease: 'Sine.easeOut',
            onComplete: () => sp.destroy(),
          });
        }
      });
    };

    this.runners.chimney = () => {
      for (const t of timers) t.remove(false);
      timers = [];
      this.tweens.killTweensOf(santaRig);
      this.tweens.killTweensOf(flash);
      resetLegs();
      santaRig.setVisible(false).setPosition(SANTA_X, HIDDEN_Y).setAngle(0);
      flash.setVisible(false).setAlpha(0);
      this.quietElves();

      this.setFire(0, 1400);
      smokePuff();
      at(3400, () => dropSoot(6, true));
      at(4100, () => {
        santaRig.setVisible(true).setPosition(SANTA_X, HIDDEN_Y).setAngle(0);
        dropSoot(5);
        this.tweens.add({ targets: santaRig, y: PEEK_Y, duration: 650, ease: 'Sine.easeOut', onComplete: () => kickLegs(14, 220, 1) });
      });
      at(5450, () => {
        dropSoot(7);
        this.tweens.add({ targets: santaRig, y: STUCK_Y, duration: 750, ease: 'Back.easeOut' });
      });
      at(6700, () => {
        dropSoot(6, true);
        kickLegs(22, 230, 2);
        this.tweens.add({
          targets: santaRig,
          angle: { from: -3, to: 3 },
          duration: 260,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => santaRig.setAngle(0),
        });
      });
      at(8600, () => {
        dropSoot(8, true);
        kickLegs(26, 190, 3);
        this.tweens.add({ targets: santaRig, y: STUCK_Y - 14 * sy, duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      });
      at(10800, () => {
        dropSoot(5);
        kickLegs(18, 180, 1);
        this.tweens.add({ targets: santaRig, y: PEEK_Y + 8 * sy, duration: 480, ease: 'Quad.easeOut' });
      });
      at(11550, () => {
        this.tweens.killTweensOf(santaRig);
        resetLegs();
        santaRig.setAngle(0);
        this.tweens.add({
          targets: santaRig,
          y: HIDDEN_Y,
          duration: 580,
          ease: 'Back.easeIn',
          onComplete: () => {
            santaRig.setVisible(false);
            dropSoot(6, true);
          },
        });
      });
      at(13600, magicRelight);
      at(15600, () => this.freeElves());
    };
  }

  /** Real-time directional lighting and contact shadows across Ace, elves, train, track, bed, and visitors. */
  private updateLighting(t: number): void {
    const { sx, sy, fx, lit } = this;
    const fire = this.fireLevel * fx.fire;
    const lights: [number, number, number, number, number, number, number, number][] = [
      [1235, 540, 780, 460, 1.0, 0.55, 0.14, 1.05 * fire + fx.flash * 0.78], // fireplace
      [180, 475, 580, 460, 1.0, 0.75, 0.32, 0.76 * (0.94 + 0.08 * Math.sin(t * 0.0026))], // tree
      [688, 360, 470, 420, 0.48, 0.68, 0.96, 0.52 * (0.94 + 0.06 * Math.sin(t * 0.0015))], // moonlight
      [1118, 164, 440, 460, 1.0, 0.74, 0.34, 0.24 * (0.9 + 0.14 * Math.sin(t * 0.011))], // candles
      [fx.lampX, fx.lampY, 260, 190, 1.0, 0.84, 0.44, 0.72 * fx.lamp], // train headlamp
    ];

    const sample = (px: number, py: number, nx: number, ny: number, mul = 1) => {
      let [r, g, b] = [0.26, 0.25, 0.33];
      for (const [lx, ly, rx, ry, lr, lg, lb, power] of lights) {
        if (power <= 0.001) continue;
        const dx = lx - px;
        const dy = ly - py;
        const d2 = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (d2 >= 1) continue;
        const w = (1 - d2) * (1 - d2) * Math.max(0.16, 0.56 + 0.44 * ((dx * nx + dy * ny) / (Math.hypot(dx, dy) || 1))) * power;
        r += lr * w;
        g += lg * w;
        b += lb * w;
      }
      return rgb(r * mul, g * mul, b * mul);
    };

    const light = (img: Phaser.GameObjects.Image, bottomShade: number, mul = 1) => {
      const w = img.displayWidth / sx;
      const h = img.displayHeight / sy;
      const l = img.x / sx - img.originX * w;
      const top = img.y / sy - img.originY * h;
      tintQuad(
        img,
        sample(l, top, -0.7, -0.7, mul),
        sample(l + w, top, 0.7, -0.7, mul),
        sample(l, top + h, -0.7, 0.7, mul * bottomShade),
        sample(l + w, top + h, 0.7, 0.7, mul * bottomShade),
      );
    };

    const tintH = (img: Phaser.GameObjects.Image, l: number, r: number) => img.setTint(l, r, l, r);

    // Ace & bed contact shadow.
    light(lit.ace, 0.73);
    lit.aceShadow
      .setPosition((BED.x - 6 * fire + 2.5) * sx, (BED.y + 15) * sy)
      .setDisplaySize(222 * sx, 54 * sy * (lit.ace.scaleY / ACE_SCALE))
      .setAlpha(0.62 + 0.14 * fire);

    // Elves & floor shadows.
    for (const elf of this.elves) {
      const hidden = elf.sprite.depth <= 3.1;
      light(elf.sprite, 0.74, hidden ? 0.72 : 1);
      elf.shadow.setVisible(!hidden);
      if (hidden) continue;
      const px = elf.sprite.x / sx;
      const py = elf.sprite.y / sy;
      const hop = Math.max(0.25, 1 - Math.max(0, (elf.points[elf.step]?.[1] ?? py) - py) / 90);
      elf.shadow
        .setDepth(elf.sprite.depth - 0.02)
        .setPosition((px + (px > BED.x ? -5 * this.fireLevel : 4)) * sx, (py - 1) * sy)
        .setDisplaySize(44 * sx * hop, 13 * sy * hop)
        .setAlpha(0.64 * hop);
    }

    // Track, train cars, and painted night layers (hearth-off darkness + subtle flicker/event tint).
    tintH(lit.track, sample(140, 720, -0.4, -0.9, 0.92), sample(1080, 720, 0.4, -0.9, 0.92));
    for (const car of this.trainCars) if (car.visible) light(car, 0.76, car.depth < 4 ? 0.86 : 1);

    const off = 1 - this.fireLevel;
    lit.hearthOff.setAlpha(off * 0.56);
    const rr = Phaser.Math.Linear(0.93 + 0.07 * fx.fire + fx.flash * 0.14, 0.62, off);
    const rg = Phaser.Math.Linear(0.95 + 0.04 * fx.fire, 0.68, off);
    const rb = Phaser.Math.Linear(0.93, 0.84, off);
    const treeL = 0.96 + 0.04 * Math.sin(t * 0.0026);
    tintH(lit['cabin-foreground'], rgb(treeL, treeL * 0.98, 0.96), rgb(rr, rg, rb));

    const lampNear = fx.lamp ? Math.max(0, 1 - Math.hypot(fx.lampX - BED.x, fx.lampY - BED.y) / 340) * 0.1 : 0;
    tintH(lit.bed, rgb(0.95 + lampNear, 0.96 + lampNear * 0.85, 0.99), rgb(rr + lampNear, rg + lampNear * 0.85, rb));

    // Outdoor window visitors (moonlit snow).
    if (lit.rudolph?.visible) tintQuad(lit.rudolph, 0x9eb8eb, 0xb8d1fa, 0x758fc7, 0x8099d1);
    if (lit.grinch?.visible) tintQuad(lit.grinch, 0x8fadde, 0xbdd6ff, 0x6b84b8, 0x8aa3d6);
  }

  update(t: number, delta: number): void {
    const prev = this.storyMs;
    this.storyMs = wrap(this.storyMs + delta * this.speed);
    if (this.skipBeat) this.skipBeat = false;
    else {
      const hit = crossedBeat(prev, this.storyMs, BEAT_MS);
      if (hit >= 0) this.runners[BEATS[hit].who]();
    }

    const vis = delta / 1000;
    const driftX = (5 * PLATE_W) / 480;
    const rise = (20 * PLATE_H) / 270;
    for (const z of this.zzz) {
      z.t = (z.t + vis * 0.16) % 1;
      z.g
        .setPosition(this.snout.x + Math.sin(z.t * Math.PI * 2) * driftX, this.snout.y - z.t * rise)
        .setAlpha(z.t < 0.1 ? z.t / 0.1 : 0.95 * (1 - (z.t - 0.1) / 0.9))
        .setScale(0.85 + z.t * 0.45);
    }

    for (let i = 0; i < this.snow.length; i++) {
      const f = this.snow[i];
      const wobble = Math.sin((f.sprite.y / this.sy) * 0.09 + f.phase) * 5;
      f.sprite.x += vis * this.sx * (OUTSIDE.wind + wobble);
      f.sprite.y += vis * this.sy * f.speed;
      if (f.sprite.y / this.sy >= OUTSIDE.y1 || f.sprite.x / this.sx > OUTSIDE.x1) this.resetFlake(i, false);
    }

    for (const m of this.motes) {
      m.phase += vis * m.speed;
      m.sprite
        .setPosition(m.x0 + Math.sin(m.phase) * m.ampX, m.y0 + Math.cos(m.phase * 0.7) * m.ampY)
        .setAlpha(m.maxAlpha * (0.5 + 0.5 * Math.sin(m.phase * 1.3)));
    }

    this.updateLighting(t);
    this.clock.setText(`christmas-2026 ${formatTime(this.storyMs)} x${this.speed}`);
    this.editor?.tick(this.storyMs);
  }
}
