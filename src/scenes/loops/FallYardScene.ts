import Phaser from 'phaser';
import data from '../../data/videos/fall-yard.json';
import { formatTime, isActive, wrap } from '../../systems/storyClock';

type WindowSec = { start: number; end: number };

const RIVER: [number, number][] = [
  [68, 268],
  [54, 210],
  [50, 160],
  [72, 108],
  [108, 68],
  [138, 38],
  [154, 22],
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

const ACE_SNOUT = { x: 226, y: 136 };

export class FallYardScene extends Phaser.Scene {
  private storyMs = 0;
  private speed = 1;
  private video = 'fall-yard';
  private clock!: Phaser.GameObjects.Text;
  private crow!: Phaser.GameObjects.Image;
  private witch!: Phaser.GameObjects.Ellipse;
  private leaves: Phaser.GameObjects.Sprite[] = [];
  private sparkles: { g: Phaser.GameObjects.Ellipse; t: number; v: number }[] = [];
  private zzz: { g: Phaser.GameObjects.Text; t: number }[] = [];

  constructor() {
    super('FallYard');
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.video = String(this.registry.get('video') ?? 'fall-yard');
    const H = data.hunt;

    this.add.image(0, 0, 'yard').setOrigin(0).setDisplaySize(480, 270).setDepth(0);

    const catEyes = this.add.container(444, 82).setDepth(2);
    catEyes.add([
      this.add.ellipse(-3, 0, 2.4, 1.6, 0xf2c84a, 0.95),
      this.add.ellipse(3, 0, 2.4, 1.6, 0xf2c84a, 0.95),
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

    for (let i = 0; i < 8; i++) {
      const g = this.add.ellipse(0, 0, 5 + (i % 3) * 2, 2 + (i % 2), 0xf4f0d8, 0.25 + (i % 4) * 0.08).setDepth(1);
      this.sparkles.push({ g, t: i / 8, v: 0.035 + (i % 3) * 0.018 });
    }

    for (let i = 0; i < 3; i++) {
      const g = this.add
        .text(0, 0, 'z', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#f4e8c8',
          stroke: '#3a2a18',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.zzz.push({ g, t: i / 3 });
    }

    this.crow = this.add.image(H.crow.x0, H.crow.y, 'crow').setOrigin(0.5, 1).setDepth(6);
    this.witch = this.add.ellipse(H.witch.x, H.witch.y, 42, 11, 0x0a0810, 0.35).setDepth(6).setScale(1.35, 1);

    for (let i = 0; i < 10; i++) {
      this.leaves.push(
        this.add.sprite(100 + i * 34, (i * 41) % 270, 'leaves', i % 4).setDepth(9).setAlpha(0.9),
      );
    }

    this.clock = this.add
      .text(6, 6, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f4e8c8' })
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
      leaf.y = (leaf.y + vis * (10 + i * 2)) % 270;
      leaf.x = 80 + ((leaf.x - 80 + vis * 6) % 360);
      leaf.angle += vis * (20 + i * 4);
    }

    for (const s of this.sparkles) {
      s.t = (s.t + vis * s.v) % 1;
      const p = alongRiver(s.t);
      s.g.setPosition(p.x, p.y);
    }

    for (const z of this.zzz) {
      z.t = (z.t + vis * 0.16) % 1;
      const t = z.t;
      z.g.setPosition(ACE_SNOUT.x + Math.sin(t * Math.PI * 2) * 5, ACE_SNOUT.y - t * 20);
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
      const x0 = ltr ? H.crow.x0 : H.crow.x1;
      const x1 = ltr ? H.crow.x1 : H.crow.x0;
      this.crow.setPosition(x0 + (x1 - x0) * p, H.crow.y - Math.sin(p * Math.PI) * 16);
      this.crow.setScale(ltr ? 1 : -1, 1);
      crowOn = true;
    }
    if (!crowOn) {
      const mid = now >= wins[0].end * 1000 && now < wins[1].start * 1000;
      this.crow.setPosition(mid ? H.crow.x1 : H.crow.x0, H.crow.y);
      this.crow.setScale(1, 1);
    }

    const wStart = H.witch.start * 1000;
    const wEnd = H.witch.end * 1000;
    if (isActive(now, wStart, wEnd)) {
      const p = Math.min(1, Math.max(0, windowP(now, H.witch.start, H.witch.end)));
      this.witch.setPosition(H.witch.x + (H.witch.xEnd - H.witch.x) * p, H.witch.y);
    } else {
      this.witch.setPosition(now < wStart ? H.witch.x : H.witch.xEnd, H.witch.y);
    }

    this.clock.setText(`${this.video} ${formatTime(now)} x${this.speed}`);
  }
}
