import data from '../../../data/videos/fall-yard.json';
import { formatTime } from '../../../systems/storyClock';

type Win = { start: number; end: number };

let onH: ((e: KeyboardEvent) => void) | undefined;

function parseTimeMs(s: string): number {
  const t = s.trim();
  const m = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  const n = Number(t);
  return Number.isFinite(n) ? n * 1000 : NaN;
}

function bindNum(root: ParentNode, obj: object): void {
  for (const inp of root.querySelectorAll<HTMLInputElement>('input[data-k]')) {
    inp.addEventListener('input', () => {
      const n = Number(inp.value);
      if (!Number.isNaN(n)) (obj as Record<string, number>)[inp.dataset.k!] = n;
    });
  }
}

function winRow(w: Win, setMs: (ms: number) => void, say: (s: string) => void): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'win';
  d.innerHTML = `<div class="row">
    <label>start</label><input type="number" data-k="start" value="${w.start}" />
    <label>end</label><input type="number" data-k="end" value="${w.end}" />
    <button class="go" type="button">Go</button>
  </div>`;
  bindNum(d, w);
  d.querySelector('button')!.addEventListener('click', () => {
    setMs(w.start * 1000);
    say(`Jump to ${formatTime(w.start * 1000)}`);
  });
  return d;
}

function flyerBlock(
  title: string,
  a: { x0: number; x1: number; y: number; windows: Win[] },
  setMs: (ms: number) => void,
  say: (s: string) => void,
): HTMLElement {
  const block = document.createElement('section');
  block.className = 'block';
  block.innerHTML = `<h2>${title}</h2>
    <div class="row">
      <label>x0</label><input type="number" data-k="x0" value="${a.x0}" />
      <label>x1</label><input type="number" data-k="x1" value="${a.x1}" />
      <label>y</label><input type="number" data-k="y" value="${a.y}" />
    </div>
    <div class="wins"></div>
    <div class="row"><button type="button" data-act="add">+ window</button></div>`;
  bindNum(block, a);
  const wins = block.querySelector('.wins')!;
  for (const w of a.windows) wins.append(winRow(w, setMs, say));
  block.querySelector('[data-act=add]')!.addEventListener('click', () => {
    const w = { start: 0, end: 6 };
    a.windows.push(w);
    wins.append(winRow(w, setMs, say));
  });
  return block;
}

export function mountFallYardEditor(ctrl: {
  setMs: (ms: number) => void;
  setHud: (on: boolean) => void;
}): { tick: (ms: number) => void; destroy: () => void } {
  for (const n of document.querySelectorAll('aside.panel')) n.remove();
  const H = data.hunt;
  const panel = document.createElement('aside');
  panel.className = 'panel hidden';
  panel.innerHTML = `
    <div class="head"><b>Loop editor</b><span>H hides this</span></div>
    <div class="row">
      <label for="jump">time</label>
      <input class="wide" id="jump" value="00:00" />
      <button class="go" type="button" id="jump-go">Go</button>
    </div>
    <div id="actors"></div>
    <button class="save" type="button" id="save">Save JSON</button>
    <p class="status" id="editor-status"></p>`;
  document.body.append(panel);

  const say = (m: string) => {
    panel.querySelector('#editor-status')!.textContent = m;
  };
  const actors = panel.querySelector('#actors')!;
  actors.append(flyerBlock('Crow', H.crow, ctrl.setMs, say));
  actors.append(flyerBlock('Witch', H.witch, ctrl.setMs, say));

  const ghost = document.createElement('section');
  ghost.className = 'block';
  ghost.innerHTML = `<h2>Ghost</h2>
    <div class="row">
      <label>x</label><input type="number" data-k="x" value="${H.ghost.x}" />
      <label>y</label><input type="number" data-k="y" value="${H.ghost.y}" />
    </div>
    <div class="wins"></div>
    <div class="row"><button type="button" data-act="add">+ window</button></div>`;
  bindNum(ghost, H.ghost);
  const gwins = ghost.querySelector('.wins')!;
  for (const w of H.ghost.windows) gwins.append(winRow(w, ctrl.setMs, say));
  ghost.querySelector('[data-act=add]')!.addEventListener('click', () => {
    const w = { start: 0, end: 6 };
    H.ghost.windows.push(w);
    gwins.append(winRow(w, ctrl.setMs, say));
  });
  actors.append(ghost);

  const jump = panel.querySelector('#jump') as HTMLInputElement;
  const goJump = () => {
    const ms = parseTimeMs(jump.value);
    if (!Number.isFinite(ms)) {
      say('Time must be mm:ss or seconds');
      return;
    }
    ctrl.setMs(ms);
    say(`Jump to ${formatTime(ms)}`);
  };
  panel.querySelector('#jump-go')!.addEventListener('click', goJump);
  jump.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goJump();
  });

  panel.querySelector('#save')!.addEventListener('click', async () => {
    say('Saving…');
    const body = JSON.stringify({ id: data.id, loopSeconds: data.loopSeconds, hunt: data.hunt }, null, 2) + '\n';
    const res = await fetch('/__save-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (!res.ok) {
      say(`Save failed: ${res.status}`);
      return;
    }
    location.reload();
  });

  if (onH) window.removeEventListener('keydown', onH);
  onH = (e) => {
    if (e.key !== 'h' && e.key !== 'H') return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const hide = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', hide);
    ctrl.setHud(!hide);
  };
  window.addEventListener('keydown', onH);

  return {
    tick(ms) {
      if (panel.classList.contains('hidden') || document.activeElement === jump) return;
      jump.value = formatTime(ms);
    },
    destroy() {
      if (onH) window.removeEventListener('keydown', onH);
      onH = undefined;
      panel.remove();
    },
  };
}
