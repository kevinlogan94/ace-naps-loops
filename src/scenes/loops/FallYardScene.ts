import Phaser from 'phaser';
import data from '../../data/videos/fall-yard.json';
import { formatTime, isActive, wrap } from '../../systems/storyClock';

type WindowSec = { start: number; end: number };

/** Native size of public/assets/custom/fall-yard.jpg */
export const PLATE_W = 2730;
export const PLATE_H = 1536;

const SX = PLATE_W / 480;
const SY = PLATE_H / 270;
const x = (n: number) => n * SX;
const y = (n: number) => n * SY;

const RIVER: [number, number][] = [
  [x(82), y(268)],
  [x(80), y(232)],
  [x(100), y(204)],
  [x(100), y(176)],
  [x(100), y(150)],
  [x(100), y(122)],
  [x(94), y(96)],
  [x(108), y(70)],
];

function alongRiver(t: number): { x: number; y: number } {
  const u = t * (RIVER.length - 1);
  const i = Math.min(RIVER.length - 2, Math.floor(u));
  const f = u - i;
  return {
    x: RIVER[i][0] + (RIVER[i + 1][0] - RIVER[i][0]) * f,
    y: RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * f,
  };
}

function windowP(t: number, startSec: number, endSec: number): number {
  return (t - startSec * 1000) / ((endSec - startSec) * 1000);
}

const ACE_SNOUT = { x: x(226), y: y(136) };

// ponytail: AABB corridors stand in for canopy polygons; swap to plate-traced polys if leaves miss the foliage.
const LEFT_BANK = { x0: 0, x1: x(90), y0: 0, y1: y(270) };
const BACK_LINE = { x0: x(80), x1: x(280), y0: 0, y1: y(90) };

function inBox(px: number, py: number, b: typeof LEFT_BANK): boolean {
  return px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1;
}

function inCanopy(px: number, py: number): boolean {
  return inBox(px, py, LEFT_BANK) || inBox(px, py, BACK_LINE);
}

function canopySpawn(intoBack: boolean): { x: number; y: number } {
  return intoBack
    ? { x: x(80) + Math.random() * x(200), y: Math.random() * y(24) }
    : { x: Math.random() * x(90), y: Math.random() * y(40) };
}

export class FallYardScene extends Phaser.Scene {
  private storyMs = 0;
  private speed = 1;
  private video = 'fall-yard';
  private clock!: Phaser.GameObjects.Text;
  private crow!: Phaser.GameObjects.Image;
  private witch!: Phaser.GameObjects.Ellipse;
  private leaves: Phaser.GameObjects.Sprite[] = [];
  private zzz: { g: Phaser.GameObjects.Text; t: number }[] = [];

  constructor() {
    super('FallYard');
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.video = String(this.registry.get('video') ?? 'fall-yard');
    const H = data.hunt;

    this.add.image(0, 0, 'yard').setOrigin(0).setDepth(0);
    this.textures.get('crow').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('leaves').setFilter(Phaser.Textures.FilterMode.NEAREST);

    const catEyes = this.add.container(x(444), y(82)).setDepth(2);
    catEyes.add([
      this.add.ellipse(-x(3), 0, x(2.4), y(1.6), 0xf2c84a, 0.95),
      this.add.ellipse(x(3), 0, x(2.4), y(1.6), 0xf2c84a, 0.95),
    ]);
    this.tweens.add({
      targets: catEyes,
      scaleY: 0.08,
      duration: 70,
      yoyo: true,
      hold: 40,
      repeat: -1,
      repeatDelay: 3200,
    });

    for (let i = 0; i < 18; i++) {
      const p = alongRiver((i + 0.35) / 18);
      const g = this.add
        .rectangle(p.x, p.y + y((i % 3) - 1), x(7 + (i % 3) * 3), y(2), 0xf4c48a, 0.2)
        .setOrigin(0.5)
        .setDepth(1);
      this.tweens.add({
        targets: g,
        alpha: 0.95,
        scaleX: 1.25,
        duration: 480 + (i % 4) * 140,
        yoyo: true,
        repeat: -1,
        delay: (i * 90) % 800,
        ease: 'Sine.easeInOut',
      });
    }

    for (let i = 0; i < 3; i++) {
      const g = this.add
        .text(0, 0, 'z', {
          fontFamily: 'monospace',
          fontSize: `${Math.round(y(12))}px`,
          color: '#f4e8c8',
          stroke: '#3a2a18',
          strokeThickness: Math.max(1, Math.round(y(2))),
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.zzz.push({ g, t: i / 3 });
    }

    this.crow = this.add
      .image(x(H.crow.x0), y(H.crow.y), 'crow')
      .setOrigin(0.5, 1)
      .setScale(SX, SY)
      .setDepth(6);
    this.witch = this.add
      .ellipse(x(H.witch.x), y(H.witch.y), x(42), y(11), 0x0a0810, 0.35)
      .setDepth(6)
      .setScale(1.35, 1);

    for (let i = 0; i < 10; i++) {
      const p = i < 4 ? canopySpawn(false) : canopySpawn(true);
      this.leaves.push(
        this.add.sprite(p.x, p.y, 'leaves', i % 4).setDepth(9).setAlpha(0.9).setScale(0.4 * SX, 0.4 * SY),
      );
    }

    this.clock = this.add
      .text(x(6), y(6), '', { fontFamily: 'monospace', fontSize: `${Math.round(y(8))}px`, color: '#f4e8c8' })
      .setDepth(100)
      .setScrollFactor(0);
  }

  update(_t: number, delta: number): void {
    const vis = delta / 1000;
    this.storyMs = wrap(this.storyMs + delta * this.speed);
    const H = data.hunt;
    const now = this.storyMs;

    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      leaf.y += vis * y(10 + i * 2);
      leaf.x += vis * x(6) + Math.sin((leaf.y / SY + i * 13) * 0.06) * x(0.4);
      leaf.angle += vis * (20 + i * 4);

      if (!inCanopy(leaf.x, leaf.y)) {
        leaf.alpha -= vis * 1.2;
        if (leaf.alpha <= 0) {
          const p = canopySpawn(i % 2 === 0);
          leaf.setPosition(p.x, p.y).setAlpha(0.9);
        }
      }
    }

    for (const z of this.zzz) {
      z.t = (z.t + vis * 0.16) % 1;
      const t = z.t;
      z.g.setPosition(ACE_SNOUT.x + Math.sin(t * Math.PI * 2) * x(5), ACE_SNOUT.y - t * y(20));
      z.g.setAlpha(t < 0.1 ? t / 0.1 : 0.95 * (1 - (t - 0.1) / 0.9));
      z.g.setScale(0.85 + t * 0.45);
    }

    const wins = H.crow.windows as WindowSec[];
    let crowOn = false;
    for (let i = 0; i < wins.length; i++) {
      const w = wins[i];
      if (!isActive(now, w.start * 1000, w.end * 1000)) continue;
      const p = Math.min(1, Math.max(0, windowP(now, w.start, w.end)));
      const ltr = i === 0;
      const x0 = x(ltr ? H.crow.x0 : H.crow.x1);
      const x1 = x(ltr ? H.crow.x1 : H.crow.x0);
      this.crow.setPosition(x0 + (x1 - x0) * p, y(H.crow.y) - Math.sin(p * Math.PI) * y(16));
      this.crow.setScale(ltr ? SX : -SX, SY);
      crowOn = true;
    }
    if (!crowOn) {
      const mid = now >= wins[0].end * 1000 && now < wins[1].start * 1000;
      this.crow.setPosition(x(mid ? H.crow.x1 : H.crow.x0), y(H.crow.y));
      this.crow.setScale(SX, SY);
    }

    const wStart = H.witch.start * 1000;
    const wEnd = H.witch.end * 1000;
    if (isActive(now, wStart, wEnd)) {
      const p = Math.min(1, Math.max(0, windowP(now, H.witch.start, H.witch.end)));
      this.witch.setPosition(x(H.witch.x) + (x(H.witch.xEnd) - x(H.witch.x)) * p, y(H.witch.y));
    } else {
      this.witch.setPosition(now < wStart ? x(H.witch.x) : x(H.witch.xEnd), y(H.witch.y));
    }

    this.clock.setText(`${this.video} ${formatTime(now)} x${this.speed}`);
  }
}
