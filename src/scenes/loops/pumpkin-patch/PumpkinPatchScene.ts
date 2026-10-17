import Phaser from 'phaser';
import { PLATE_H, PLATE_W } from '../../../plate';
import { crossedBeat, wrap } from '../../../systems/storyClock';
import leavesUrl from '../fall-yard/leaves.png';
import aceUrl from './ace.png';
import patchUrl from './pumpkin-patch.jpg';
import slenderUrl from './slender.png';
import witchUrl from './witch-silhouette.png';

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
/** Midpoint of the painted eyes. Lids sit six source pixels to either side. */
const SCARE_FACE = { x: 906, y: 352 };
/** Cheek color, so a full lid disappears into the face. */
const SCARE_LID = 0xae6829;
/** Back-yard leaves vanish at the top rail. They never cross into the foreground. */
const FENCE_Y = 250;

/** Two thirds of the first pebble. Small beside the pumpkins. */
const SOOT_SCALE = 3 / 4;
/** Drawn texture is 14px. This is its height in source pixels. Eyes sit near the top. */
const SOOT_SRC_H = 14 * SOOT_SCALE * (PLATE_W / SRC_W) / (PLATE_H / SRC_H);
/** Source pixels of head that clear a prop while peeking. */
const PEEK = 6;
/** Cottage leaves pass the path soot at about 64. Right-tree leaves pass the right soot at about 82. */
const LEAF_SCARE = 88;
/** One soot's full grass pass, then the next. Four soots means each waits 12 minutes. */
const SOOT_GAP = 3 * 60 * 1000;
/** Off the right edge, high in the sky. They face left, so they cross right to left. */
const WITCH = { x0: SRC_W + 40, x1: -48, y: 32, scale: 0.08 };
const WITCH_MS = 22_000;
/** Three of the same silhouette. dx is behind the lead. */
const WITCH_PACK = [
  { dx: 0, dy: 0 },
  { dx: 26, dy: 3 },
  { dx: 50, dy: -5 },
] as const;
/** Rear is larger and lower. Stop left of the path pumpkin (crop at x 384). */
const SHEETS = [
  { x0: 20, x1: 230, y: 404, scale: 1.1 },
  { x0: 95, x1: 305, y: 396, scale: 0.9 },
] as const;
const SHEET_ALPHA = 0.5;
const SHEET_WALK = 7000;
const SHEET_LAG = 900;
const SHEET_HOLD = 5000;
const SHEET_FADE = 1000;
/** Lower right of the last orchard tree. Drops into the sky above the fence. */
const SPIDER = { x: 358, y0: 186, y1: 236 };
const SPIDER_DOWN = 1600;
const SPIDER_HOLD = 1200;
const SPIDER_UP = 1200;
/** Beside the left orchard tree. Origin is the feet (x center, y bottom). */
const SLENDER = { x: 100, y: 266, scale: 0.2 };
const SLENDER_HOLD = 10_000;
const STATIC_MS = 640;

/** Visitors on the 15-minute clock. Soots keep their own 3-minute turn. */
const BEATS: { sec: number; who: 'spider' | 'witches' | 'sheets' | 'slender' }[] = [
  { sec: 60, who: 'spider' },
  { sec: 240, who: 'witches' },
  { sec: 420, who: 'sheets' },
  { sec: 510, who: 'spider' },
  { sec: 690, who: 'slender' },
  { sec: 870, who: 'witches' },
];
const BEAT_MS = BEATS.map((b) => b.sec * 1000);

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
    { x: 450, y: 350 },
    { x: 485, y: 365 },
    { x: 440, y: 370 },
  ],
];

/** Crop is the painted prop, in source pixels. Hide is inside that crop. */
const COVERS: {
  crop: { x: number; y: number; w: number; h: number };
  hide: { x: number; y: number };
}[] = [
  // Big pumpkin in the bottom-left foreground. Top is the stem. Right edge is that pumpkin only.
  { crop: { x: 0, y: 448, w: 142, h: 123 }, hide: { x: 68, y: 500 } },
  // Wheel. The leaf pile stays out of the crop.
  { crop: { x: 546, y: 455, w: 86, h: 92 }, hide: { x: 592, y: 484 } },
  // Scarecrow and the hay he slips behind. Grass spots stay left of x 878.
  { crop: { x: 878, y: 328, w: 146, h: 92 }, hide: { x: 974, y: 350 } },
  // Small pumpkin on the path.
  { crop: { x: 384, y: 334, w: 44, h: 34 }, hide: { x: 406, y: 356 } },
];

type Soot = {
  sprite: Phaser.GameObjects.Image;
  points: { x: number; y: number }[];
  hide: { x: number; y: number };
  /** Top of the prop crop. The peek puts the eyes just above it. */
  rim: number;
  step: number;
  mood: 'open' | 'bolt' | 'hide' | 'peek' | 'creep';
  wait?: Phaser.Time.TimerEvent;
};

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
  private soots: Soot[] = [];
  private sootTurn = 0;
  /** Sheets or Slender on screen. Soots stay in their hides until this is 0. */
  private sootHolds = 0;
  private sootDue = false;
  private witches: Phaser.GameObjects.Image[] = [];
  private sheets: Phaser.GameObjects.Graphics[] = [];
  private zzz: { g: Phaser.GameObjects.Text; t: number }[] = [];
  private snout = { x: 0, y: 0 };
  private storyMs = 0;
  private speed = 1;
  private dropSpider: () => void = () => {};
  private showSlender: () => void = () => {};

  constructor() {
    super('PumpkinPatch');
  }

  preload(): void {
    this.load.image('patch', patchUrl);
    this.load.image('ace', aceUrl);
    this.load.image('witch-silhouette', witchUrl);
    this.load.image('slender', slenderUrl);
    this.load.spritesheet('leaves', leavesUrl, { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.sx = PLATE_W / SRC_W;
    this.sy = PLATE_H / SRC_H;
    const { sx, sy } = this;
    this.textures.get('patch').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('ace').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('leaves').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('witch-silhouette').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('slender').setFilter(Phaser.Textures.FilterMode.NEAREST);

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

    // Same rise as the fall yard: three z's leave the snout and fade out.
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

    this.makeSmokePuff();
    const puff = () => this.emitSmoke(CHIMNEY.x * sx, CHIMNEY.y * sy, sx);
    puff();
    this.time.addEvent({ delay: 500, loop: true, callback: puff });

    this.makeCookTextures();
    this.cook(sx, sy);
    this.spawnSoot(sx, sy);
    this.blinkScarecrow(sx, sy);

    this.witches = WITCH_PACK.map((w) =>
      this.add
        .image((WITCH.x0 + w.dx) * sx, (WITCH.y + w.dy) * sy, 'witch-silhouette')
        .setOrigin(0.5)
        .setScale(sx * WITCH.scale)
        .setDepth(2)
        .setVisible(false),
    );
    this.sheets = [this.makeSheet(), this.makeSheet()];
    this.hangSpider(sx, sy);
    this.hauntSlender(sx, sy);
  }

  /** The clock calls this once, when a slot starts. */
  private playBeat(who: (typeof BEATS)[number]['who']): void {
    if (who === 'spider') this.dropSpider();
    else if (who === 'witches') this.flyWitches();
    else if (who === 'sheets') this.visitSheets();
    else this.showSlender();
  }

  /** Full-plate snow. He flips on at the middle of the burst, off the same way. */
  private hauntSlender(sx: number, sy: number): void {
    this.makeStatic();
    const shade = this.add
      .ellipse(SLENDER.x * sx, (SLENDER.y + 2) * sy, 22 * sx, 7 * sy, 0x4a2814, 0.4)
      .setDepth(0.85)
      .setVisible(false);
    const body = this.add
      .image(SLENDER.x * sx, SLENDER.y * sy, 'slender')
      .setOrigin(0.5, 1)
      .setScale(sx * SLENDER.scale)
      .setDepth(0.9)
      .setVisible(false);
    const snow = this.add
      .image(0, 0, 'static-0')
      .setOrigin(0)
      .setDisplaySize(PLATE_W, PLATE_H)
      .setDepth(20)
      .setVisible(false);

    const burst = (flip: () => void, then: () => void) => {
      let frame = 0;
      snow.setVisible(true).setTexture('static-0').setAlpha(1);
      const tick = this.time.addEvent({
        delay: 40,
        repeat: Math.ceil(STATIC_MS / 40) - 1,
        callback: () => {
          frame = (frame + 1) % 4;
          snow.setTexture(`static-${frame}`).setAlpha(Phaser.Math.FloatBetween(0.7, 1));
        },
      });
      this.time.delayedCall(STATIC_MS / 2, flip);
      this.time.delayedCall(STATIC_MS, () => {
        tick.remove(false);
        snow.setVisible(false);
        then();
      });
    };

    const hide = () => {
      burst(
        () => {
          body.setVisible(false);
          shade.setVisible(false);
        },
        () => this.freeSoots(),
      );
    };

    const show = () => {
      this.quietSoots();
      burst(
        () => {
          body.setVisible(true);
          shade.setVisible(true);
        },
        () => this.time.delayedCall(SLENDER_HOLD, hide),
      );
    };

    this.showSlender = show;
  }

  private makeStatic(): void {
    if (this.textures.exists('static-0')) return;
    const g = this.add.graphics();
    const w = 80;
    const h = 45;
    for (let i = 0; i < 4; i++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          g.fillStyle(Phaser.Math.Between(0, 1) ? 0xffffff : 0x111111);
          g.fillRect(x, y, 1, 1);
        }
      }
      g.generateTexture(`static-${i}`, w, h);
      g.clear();
      this.textures.get(`static-${i}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    g.destroy();
  }

  /** Pixel spider on a thread. Down from an orchard tree, dangle, then back up. */
  private hangSpider(sx: number, sy: number): void {
    this.makeSpider();
    const x = SPIDER.x * sx;
    const y0 = SPIDER.y0 * sy;
    const y1 = SPIDER.y1 * sy;
    const thread = this.add
      .rectangle(x, y0, 1, 1, 0x3a342c)
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setVisible(false);
    const body = this.add
      .image(x, y0, 'spider')
      .setOrigin(0.5, 0)
      .setScale(sx * 1.2)
      .setDepth(2)
      .setVisible(false);

    const follow = () => {
      const h = body.y - y0;
      thread.setVisible(h > 1).setDisplaySize(thread.width, Math.max(1, h));
    };

    const climb = () => {
      this.tweens.killTweensOf(body);
      body.setX(x).setAngle(0);
      this.tweens.add({
        targets: body,
        y: y0,
        duration: SPIDER_UP,
        ease: 'Sine.easeIn',
        onUpdate: follow,
        onComplete: () => {
          body.setVisible(false);
          thread.setVisible(false);
        },
      });
    };

    const drop = () => {
      body.setVisible(true).setPosition(x, y0).setAngle(0);
      follow();
      this.tweens.add({
        targets: body,
        y: y1,
        duration: SPIDER_DOWN,
        ease: 'Sine.easeOut',
        onUpdate: follow,
        onComplete: () => {
          this.tweens.add({
            targets: body,
            x: x + sx,
            angle: 6,
            duration: 280,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
          });
          this.time.delayedCall(SPIDER_HOLD, climb);
        },
      });
    };

    this.dropSpider = drop;
  }

  private makeSpider(): void {
    if (this.textures.exists('spider')) return;
    const g = this.add.graphics();
    const cell = 1;
    const rows = ['# # #', ' ### ', '#w#w#', ' ### ', '# # #'];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ') continue;
        g.fillStyle(ch === 'w' ? 0xe8dcc8 : 0x1c1612);
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    });
    g.generateTexture('spider', rows[0].length * cell, rows.length * cell);
    g.destroy();
    this.textures.get('spider').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /** Dark sheet: oval head, scalloped hem, two pale eyes. */
  private makeSheet(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(3.1).setVisible(false);
    const gw = 18 * (PLATE_W / 480);
    const gh = 36 * (PLATE_H / 270);
    const rx = gw / 2;
    const cy = -gh * 0.55;
    const ry = gh * 0.36;
    const hem = gh * 0.05;
    const dip = gh * 0.08;
    g.fillStyle(0x16101c, 1);
    g.beginPath();
    g.moveTo(-rx, cy);
    for (let i = 1; i <= 12; i++) {
      const a = Math.PI + (Math.PI * i) / 12;
      g.lineTo(Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      g.lineTo(rx - t * 2 * rx, hem + Math.abs(Math.sin(t * Math.PI * 3)) * dip);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0xd8d0e0, 0.75);
    g.fillEllipse(-rx * 0.28, cy - ry * 0.28, rx * 0.22, ry * 0.28);
    g.fillEllipse(rx * 0.28, cy - ry * 0.28, rx * 0.22, ry * 0.28);
    return g;
  }

  private parkSheet(i: number): void {
    const spot = SHEETS[i];
    const g = this.sheets[i];
    this.tweens.killTweensOf(g);
    g.setVisible(false)
      .setAlpha(0)
      .setAngle(0)
      .setScale(spot.scale)
      .setPosition(spot.x0 * this.sx, spot.y * this.sy);
  }

  /** Up the path, stand, walk back off. */
  private visitSheets(): void {
    this.quietSoots();
    this.sheets.forEach((_, i) => this.parkSheet(i));
    const { sx, sy } = this;
    SHEETS.forEach((spot, i) => {
      const g = this.sheets[i];
      this.time.delayedCall(i * SHEET_LAG, () => {
        g.setVisible(true);
        this.tweens.add({ targets: g, alpha: SHEET_ALPHA, duration: 500 });
        this.tweens.add({
          targets: g,
          x: spot.x1 * sx,
          duration: SHEET_WALK,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: g,
          y: spot.y * sy + 3 * sy,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    });
    this.time.delayedCall(SHEET_LAG + SHEET_WALK + SHEET_HOLD, () => this.leaveSheets());
  }

  private leaveSheets(): void {
    SHEETS.forEach((spot, i) => {
      const g = this.sheets[i];
      const delay = i * SHEET_LAG;
      this.tweens.add({
        targets: g,
        x: spot.x0 * this.sx,
        duration: SHEET_WALK,
        delay,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (i !== SHEETS.length - 1) return;
          this.sheets.forEach((_, j) => this.parkSheet(j));
          this.freeSoots();
        },
      });
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: SHEET_FADE,
        delay: delay + SHEET_WALK - SHEET_FADE,
      });
    });
  }

  /** Tiny far pack over the orchard, then they wait and go again. */
  private flyWitches(): void {
    const { sx, sy } = this;
    WITCH_PACK.forEach((w, i) => {
      const sprite = this.witches[i];
      this.tweens.killTweensOf(sprite);
      sprite
        .setVisible(true)
        .setScale(sx * WITCH.scale)
        .setPosition((WITCH.x0 + w.dx) * sx, (WITCH.y + w.dy) * sy)
        .setAngle(-6);
      this.tweens.add({
        targets: sprite,
        x: (WITCH.x1 + w.dx) * sx,
        duration: WITCH_MS,
        ease: 'Linear',
        onComplete: () => {
          this.tweens.killTweensOf(sprite);
          sprite.setVisible(false);
        },
      });
      this.tweens.add({
        targets: sprite,
        y: (WITCH.y + w.dy) * sy + 3 * sy,
        angle: 6,
        duration: 1200 + i * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /**
   * Face-colored lids. They rest flat so the painted eyes show, then cover them.
   * Depth matches the scarecrow crop, which is added first and would hide a lower lid.
   */
  private blinkScarecrow(sx: number, sy: number): void {
    const lidH = 6 * sy;
    const eyes = this.add
      .container(SCARE_FACE.x * sx, SCARE_FACE.y * sy - lidH / 2)
      .setDepth(3);
    eyes.add([
      this.add.rectangle(-6 * sx, 0, 7 * sx, lidH, SCARE_LID).setOrigin(0.5, 0),
      this.add.rectangle(5 * sx, 0, 5 * sx, lidH, SCARE_LID).setOrigin(0.5, 0),
    ]);
    eyes.setScale(1, 0);
    this.tweens.add({
      targets: eyes,
      scaleY: 1,
      duration: 70,
      yoyo: true,
      hold: 40,
      repeat: -1,
      repeatDelay: 8000,
    });
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

    this.soots = [];
    COVERS.forEach((cover) => {
      // ponytail: a hide outside its crop stands on top of the prop. Upgrade path is a drawn mask.
      const top = cover.hide.y - SOOT_SRC_H;
      if (top < cover.crop.y || cover.hide.y > cover.crop.y + cover.crop.h) {
        throw new Error('soot hide is outside its cover');
      }
      const { x, y, w, h } = cover.crop;
      this.add
        .image(0, 0, 'patch')
        .setOrigin(0, 0)
        .setDisplaySize(PLATE_W, PLATE_H)
        .setDepth(3)
        .setCrop(x, y, w, h);
    });

    const scale = sx * SOOT_SCALE;
    SOOTS.forEach((points, i) => {
      const cover = COVERS[i];
      const sprite = this.add
        .image(cover.hide.x * sx, cover.hide.y * sy, 'soot')
        .setOrigin(0.5, 1)
        .setDepth(1 + cover.hide.y / SRC_H)
        .setScale(scale);
      const soot: Soot = {
        sprite,
        points,
        hide: cover.hide,
        rim: cover.crop.y,
        step: points.length - 1,
        mood: 'hide',
      };
      this.soots.push(soot);
      this.time.delayedCall(i * 500, () => this.blinkSoot(soot));
    });
    this.nextSoot();
    this.time.addEvent({ delay: SOOT_GAP, loop: true, callback: () => this.nextSoot() });
  }

  /** Sheets and Slender clear the grass. A turn that lands then waits until they leave. */
  private quietSoots(): void {
    this.sootHolds++;
    for (const soot of this.soots) this.tuckSoot(soot);
  }

  private freeSoots(): void {
    if (this.sootHolds === 0) return;
    this.sootHolds--;
    if (this.sootHolds === 0 && this.sootDue) this.nextSoot();
  }

  private nextSoot(): void {
    if (this.sootHolds > 0) {
      this.sootDue = true;
      return;
    }
    this.sootDue = false;
    this.creepSoot(this.soots[this.sootTurn++ % this.soots.length]);
  }

  /** Back under the prop, and the rest of this outing is cancelled. */
  private tuckSoot(soot: Soot): void {
    if (soot.mood === 'hide') return;
    soot.mood = 'hide';
    soot.wait?.remove(false);
    soot.wait = undefined;
    this.tweens.killTweensOf(soot.sprite);
    const scale = this.sx * SOOT_SCALE;
    soot.sprite.setTexture('soot').setScale(scale).setDepth(1 + soot.hide.y / SRC_H);
    this.tweens.add({
      targets: soot.sprite,
      x: soot.hide.x * this.sx,
      y: soot.hide.y * this.sy,
      duration: 280,
      ease: 'Quad.easeIn',
    });
  }

  /** Eyes only while it is out. The peek blinks on its own. */
  private blinkSoot(soot: Soot): void {
    this.time.delayedCall(Phaser.Math.Between(1800, 4200), () => {
      if (soot.mood !== 'open') {
        this.blinkSoot(soot);
        return;
      }
      soot.sprite.setTexture('soot-shut');
      this.time.delayedCall(140, () => {
        if (soot.mood === 'open') soot.sprite.setTexture('soot');
        this.blinkSoot(soot);
      });
    });
  }

  private waitSoot(soot: Soot): void {
    soot.mood = 'open';
    soot.sprite.setTexture('soot');
    this.trembleSoot(soot);
    soot.wait = this.time.delayedCall(Phaser.Math.Between(2200, 4000), () => {
      soot.wait = undefined;
      this.boltSoot(soot);
    });
  }

  /** One source pixel. It already regrets being out. */
  private trembleSoot(soot: Soot): void {
    this.tweens.add({
      targets: soot.sprite,
      x: soot.sprite.x + this.sx,
      duration: 90,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private boltSoot(soot: Soot): void {
    if (soot.mood !== 'open') return;
    soot.mood = 'bolt';
    soot.wait?.remove(false);
    soot.wait = undefined;
    this.tweens.killTweensOf(soot.sprite);
    const scale = this.sx * SOOT_SCALE;
    soot.sprite.setTexture('soot').setScale(scale).setDepth(1 + soot.hide.y / SRC_H);
    this.tweens.add({
      targets: soot.sprite,
      x: soot.hide.x * this.sx,
      y: soot.hide.y * this.sy,
      duration: Phaser.Math.Between(350, 500),
      ease: 'Quad.easeIn',
      onComplete: () => this.hideSoot(soot),
    });
    this.tweens.add({
      targets: soot.sprite,
      scaleY: scale * 0.86,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private hideSoot(soot: Soot): void {
    soot.mood = 'hide';
    if (this.sootHolds > 0) return;
    this.time.delayedCall(Phaser.Math.Between(1500, 2500), () => {
      if (this.sootHolds > 0 || soot.mood !== 'hide') return;
      this.peekSoot(soot);
    });
  }

  private peekSoot(soot: Soot): void {
    soot.mood = 'peek';
    const y = (soot.rim + SOOT_SRC_H - PEEK) * this.sy;
    this.tweens.add({
      targets: soot.sprite,
      x: soot.hide.x * this.sx,
      y,
      duration: Phaser.Math.Between(280, 420),
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.sootHolds > 0) {
          this.tuckSoot(soot);
          return;
        }
        soot.sprite.setTexture('soot-shut');
        this.time.delayedCall(140, () => {
          if (this.sootHolds > 0) {
            this.tuckSoot(soot);
            return;
          }
          soot.sprite.setTexture('soot');
          this.time.delayedCall(Phaser.Math.Between(700, 1100), () => {
            if (this.sootHolds > 0) {
              this.tuckSoot(soot);
              return;
            }
            this.yankSoot(soot);
          });
        });
      },
    });
  }

  private yankSoot(soot: Soot): void {
    soot.mood = 'hide';
    this.tweens.add({
      targets: soot.sprite,
      x: soot.hide.x * this.sx,
      y: soot.hide.y * this.sy,
      duration: Phaser.Math.Between(140, 200),
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (soot.step === soot.points.length - 1 || this.sootHolds > 0) return;
        this.time.delayedCall(Phaser.Math.Between(400, 800), () => {
          if (this.sootHolds > 0) return;
          this.creepSoot(soot);
        });
      },
    });
  }

  private creepSoot(soot: Soot): void {
    if (this.sootHolds > 0) return;
    soot.mood = 'creep';
    soot.step = (soot.step + 1) % soot.points.length;
    const next = soot.points[soot.step];
    const scale = this.sx * SOOT_SCALE;
    soot.sprite.setScale(scale).setDepth(1 + next.y / SRC_H);
    this.tweens.add({
      targets: soot.sprite,
      x: next.x * this.sx,
      y: next.y * this.sy,
      duration: Phaser.Math.Between(1100, 1700),
      ease: 'Sine.easeInOut',
      onComplete: () => this.waitSoot(soot),
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
    const prev = this.storyMs;
    this.storyMs = wrap(this.storyMs + delta * this.speed);
    const hit = crossedBeat(prev, this.storyMs, BEAT_MS);
    if (hit >= 0) this.playBeat(BEATS[hit].who);
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
    for (let i = 0; i < this.leaves.length; i++) {
      const { sprite: leaf, tree } = this.leaves[i];
      const crown = TREES[tree];
      const wobble = Math.sin((leaf.y / this.sy + i * 13) * 0.08) * 4;
      leaf.x += vis * this.sx * (crown.wind + wobble);
      leaf.y += vis * this.sy * 20;
      leaf.angle += vis * (40 + (i % 5) * 12);
      this.scareSoot(leaf);
      const srcY = leaf.y / this.sy;
      if (crown.stopY < SRC_H) {
        leaf.setAlpha(Math.max(0, Math.min(1, (crown.stopY - srcY) / crown.fade)));
      }
      if (srcY >= crown.stopY || leaf.x > PLATE_W + 40) this.dropLeaf(i, false);
    }
  }

  /** A nearby falling leaf sends an open soot into its hide. */
  private scareSoot(leaf: Phaser.GameObjects.Sprite): void {
    const lx = leaf.x / this.sx;
    const ly = leaf.y / this.sy;
    for (let i = 0; i < this.soots.length; i++) {
      const soot = this.soots[i];
      if (soot.mood !== 'open') continue;
      const dx = soot.sprite.x / this.sx - lx;
      const dy = soot.sprite.y / this.sy - ly;
      if (dx * dx + dy * dy < LEAF_SCARE * LEAF_SCARE) this.boltSoot(soot);
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
