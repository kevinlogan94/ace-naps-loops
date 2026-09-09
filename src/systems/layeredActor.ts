import Phaser from 'phaser';

/** Custom sheets: 4 walk frames, rows up / left / down / right. */
const WALK_COLS = 4;
const SIT_COLS = 3;

export class LayeredActor {
  readonly view: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private dir = 2;
  private frame = 0;
  private acc = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, key: string, depth: number) {
    this.sprite = scene.add.sprite(0, 0, key, WALK_COLS * 2);
    this.view = scene.add.container(x, y, [this.sprite]).setDepth(depth);
  }

  setKey(key: string, startFrame: number): void {
    this.sprite.setTexture(key, startFrame);
  }

  face(dx: number, dy: number): void {
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : dy < 0 ? 0 : 2;
  }

  walk(dt: number, moving: boolean): void {
    if (!moving) {
      this.frame = 0;
      this.paint(this.dir * WALK_COLS);
      return;
    }
    this.acc += dt;
    if (this.acc > 0.12) {
      this.acc = 0;
      this.frame = (this.frame + 1) % WALK_COLS;
    }
    this.paint(this.dir * WALK_COLS + this.frame);
  }

  sit(): void {
    this.paint(this.dir * SIT_COLS + 1);
  }

  private paint(frame: number): void {
    this.sprite.setFrame(frame);
  }
}
