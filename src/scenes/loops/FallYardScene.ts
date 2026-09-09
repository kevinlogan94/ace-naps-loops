import Phaser from 'phaser';
import data from '../../data/videos/fall-yard.json';
import { formatTime, isActive, wrap } from '../../systems/storyClock';
import { stepToward } from '../../systems/walker';
import { LayeredActor } from '../../systems/layeredActor';

type WindowSec = { start: number; end: number };

const GRASS = [17, 19, 20, 21];
const SHORE_L = 256;
const SHORE_R = 258;
const WATER = [268, 269, 270, 271];
const TREE_SM_ORANGE = 2;
const TREE_SM_RED = 1;
const TREE_MD_ORANGE = 0;

function fadeAlpha(t: number, startSec: number, endSec: number, fadeMs = 800): number {
  const start = startSec * 1000;
  const end = endSec * 1000;
  if (!isActive(t, start, end)) return 0;
  const into = t - start;
  const left = end - t;
  if (into < fadeMs) return into / fadeMs;
  if (left < fadeMs) return left / fadeMs;
  return 1;
}

function grassAt(x: number, y: number): number {
  return GRASS[(x * 3 + y * 7) % GRASS.length];
}

function waterAt(y: number): number {
  return WATER[y % WATER.length];
}

export class FallYardScene extends Phaser.Scene {
  private storyMs = 0;
  private speed = 1;
  private video = 'fall-yard';
  private clock!: Phaser.GameObjects.Text;
  private lantern!: Phaser.GameObjects.Sprite;
  private crow!: Phaser.GameObjects.Image;
  private witch!: LayeredActor;
  private kevin!: LayeredActor;
  private leaves: Phaser.GameObjects.Sprite[] = [];
  private wpI = 0;
  private kevinPos = { x: 0, y: 0 };
  private sitting = false;

  constructor() {
    super('FallYard');
  }

  create(): void {
    this.speed = Number(this.registry.get('speed') ?? 1) || 1;
    this.video = String(this.registry.get('video') ?? 'fall-yard');
    const L = data.layout;
    const H = data.hunt;

    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 15; x++) {
        let frame = grassAt(x, y);
        if (x === 2) frame = SHORE_L;
        else if (x === 3) frame = waterAt(y);
        else if (x === 4) frame = SHORE_R;
        this.add.image(x * 32, y * 32, 'terrain', frame).setOrigin(0).setDepth(0);
      }
      this.add.sprite(96, y * 32, 'ripple', 0).setOrigin(0).setDepth(1).play('ripple');
    }

    this.add.image(-28, -24, 'trees', TREE_MD_ORANGE).setOrigin(0).setDepth(3);
    this.add.image(-36, 70, 'trees', TREE_SM_RED).setOrigin(0).setDepth(3);
    this.add.image(-20, 158, 'trees', TREE_SM_ORANGE).setOrigin(0).setDepth(3);
    this.add.image(408, -32, 'trees', TREE_SM_RED).setOrigin(0).setDepth(3);
    this.add.image(412, 156, 'trees', TREE_MD_ORANGE).setOrigin(0).setDepth(3);

    this.add.image(288, 2, 'house').setOrigin(0).setDepth(2);

    const flowers = [
      [108, 48, 2],
      [124, 92, 8],
      [148, 36, 14],
      [176, 70, 20],
      [232, 44, 26],
      [252, 168, 3],
      [276, 196, 11],
      [164, 220, 17],
      [140, 188, 23],
      [348, 188, 5],
      [372, 212, 15],
      [220, 84, 29],
    ];
    for (const [x, y, frame] of flowers) {
      this.add.image(x, y, 'wildflowers', frame).setOrigin(0).setDepth(2);
    }

    this.add.image(H.always[0].x, H.always[0].y, 'hunt', 0).setOrigin(0.5, 1).setDepth(4);
    this.add.image(H.always[1].x, H.always[1].y, 'hunt', 1).setOrigin(0.5, 1).setDepth(4);
    this.add.image(H.always[2].x, H.always[2].y, 'hunt', 2).setOrigin(0.5, 1).setDepth(4);
    this.add.image(H.always[3].x, H.always[3].y, 'hunt', 3).setOrigin(0.5, 1).setDepth(4);
    this.add.image(H.always[4].x, H.always[4].y, 'hunt', 4).setOrigin(0.5, 1).setDepth(4);

    this.add.sprite(L.ace.x, L.ace.y, 'ace', 0).setOrigin(0.5, 1).setDepth(L.ace.y).play('ace-nap');
    this.add.ellipse(L.ace.x, L.ace.y - 2, L.ace.w, L.ace.h * 0.3, 0x2a1a10, 0.22).setDepth(L.ace.y - 1);
    this.lantern = this.add
      .sprite(H.lantern.x, H.lantern.y, 'lantern', 0)
      .setOrigin(0.5, 1)
      .setScale(0.42)
      .setDepth(6)
      .setAlpha(0);
    this.crow = this.add.image(H.crow.x, H.crow.y, 'crow').setOrigin(0.5, 1).setDepth(6).setAlpha(0);

    this.witch = new LayeredActor(this, H.witch.x, H.witch.y, 'witch-walk', 7);
    this.witch.view.setAlpha(0);

    this.kevinPos = { x: L.kevinStart.x, y: L.kevinStart.y };
    this.kevin = new LayeredActor(this, this.kevinPos.x, this.kevinPos.y, 'kevin-walk', 8);

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

    this.lantern.setAlpha(fadeAlpha(now, H.lantern.start, H.lantern.end));

    let crowA = 0;
    for (const w of H.crow.windows as WindowSec[]) crowA = Math.max(crowA, fadeAlpha(now, w.start, w.end));
    this.crow.setAlpha(crowA);

    const witchA = fadeAlpha(now, H.witch.start, H.witch.end);
    this.witch.view.setAlpha(witchA);
    if (witchA > 0) {
      const span = (H.witch.end - H.witch.start) * 1000;
      const p = (now - H.witch.start * 1000) / span;
      const y = H.witch.y + (H.witch.yEnd - H.witch.y) * Math.min(1, Math.max(0, p));
      this.witch.view.setPosition(H.witch.x, y);
      this.witch.face(0, 1);
      this.witch.walk(vis, true);
    }

    const wantSit = isActive(now, H.sit.start * 1000, H.sit.end * 1000);
    const acePt = data.waypoints[1];
    const prev = { x: this.kevinPos.x, y: this.kevinPos.y };
    if (wantSit) {
      if (!this.sitting) {
        this.kevin.setKey('kevin-sit', 7);
        this.sitting = true;
      }
      stepToward(this.kevinPos, acePt, 80, vis);
      this.kevin.sit();
    } else {
      if (this.sitting) {
        this.kevin.setKey('kevin-walk', 8);
        this.sitting = false;
      }
      if (stepToward(this.kevinPos, data.waypoints[this.wpI], 36, vis)) {
        this.wpI = (this.wpI + 1) % data.waypoints.length;
      }
      this.kevin.face(this.kevinPos.x - prev.x, this.kevinPos.y - prev.y);
      this.kevin.walk(vis, true);
    }
    this.kevin.view.setPosition(this.kevinPos.x, this.kevinPos.y);
    this.kevin.view.setDepth(this.kevinPos.y);

    this.clock.setText(`${this.video} ${formatTime(now)} x${this.speed}`);
  }
}
