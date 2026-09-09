import Phaser from 'phaser';

/** Rows are up / left / down / right. */
const CYCLE_SEC = 0.5;

export class LayeredActor {
  readonly view: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private dir = 2;
  private frame = 0;
  private acc = 0;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
    depth: number,
    private readonly walkCols = 4,
  ) {
    this.sprite = scene.add.sprite(0, 0, key, walkCols * 2);
    this.view = scene.add.container(x, y, [this.sprite]).setDepth(depth);
  }

  face(dx: number, dy: number): void {
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : dy < 0 ? 0 : 2;
  }

  walk(dt: number, moving: boolean): void {
    if (!moving) {
      this.frame = 0;
      this.paint(this.dir * this.walkCols);
      return;
    }
    this.acc += dt;
    if (this.acc > CYCLE_SEC / this.walkCols) {
      this.acc = 0;
      this.frame = (this.frame + 1) % this.walkCols;
    }
    this.paint(this.dir * this.walkCols + this.frame);
  }

  private paint(frame: number): void {
    this.sprite.setFrame(frame);
  }
}
