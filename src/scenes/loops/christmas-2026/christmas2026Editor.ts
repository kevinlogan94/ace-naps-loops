import { formatTime } from '../../../systems/storyClock';

export type ChristmasWho = 'sleigh' | 'rudolph' | 'grinch' | 'train' | 'chimney';

let onH: ((e: KeyboardEvent) => void) | undefined;

function parseTimeMs(s: string): number {
  const t = s.trim();
  const m = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  const n = Number(t);
  return Number.isFinite(n) ? n * 1000 : NaN;
}

export function mountChristmas2026Editor(ctrl: {
  beats: { sec: number; who: ChristmasWho }[];
  setMs: (ms: number) => void;
  play: (who: ChristmasWho) => void;
  elf: () => void;
  setHud: (on: boolean) => void;
}): { tick: (ms: number) => void; destroy: () => void } {
  for (const n of document.querySelectorAll('aside.panel')) n.remove();
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
    <p class="status" id="editor-status"></p>`;
  document.body.append(panel);

  const say = (m: string) => {
    panel.querySelector('#editor-status')!.textContent = m;
  };
  const actors = panel.querySelector('#actors')!;

  const beats = document.createElement('section');
  beats.className = 'block';
  beats.innerHTML = `<h2>Visitors</h2>`;
  for (const b of ctrl.beats) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<label>${formatTime(b.sec * 1000)}</label><span>${b.who}</span>`;
    const go = document.createElement('button');
    go.className = 'go';
    go.type = 'button';
    go.textContent = 'Go';
    go.addEventListener('click', () => {
      ctrl.setMs(b.sec * 1000);
      ctrl.play(b.who);
      say(`Play ${b.who} at ${formatTime(b.sec * 1000)}`);
    });
    row.append(go);
    beats.append(row);
  }
  actors.append(beats);

  const elf = document.createElement('section');
  elf.className = 'block';
  elf.innerHTML = `<h2>Elf</h2><div class="row"><span>next floor pass</span></div>`;
  const elfGo = document.createElement('button');
  elfGo.className = 'go';
  elfGo.type = 'button';
  elfGo.textContent = 'Go';
  elfGo.addEventListener('click', () => {
    ctrl.elf();
    say('Next elf');
  });
  elf.querySelector('.row')!.append(elfGo);
  actors.append(elf);

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
