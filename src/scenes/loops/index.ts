import { FallYardScene } from './fall-yard/FallYardScene';
import { PumpkinPatchScene } from './pumpkin-patch/PumpkinPatchScene';

/** Path slug → scene. `/` uses the default. Add the next loop here. */
const loops = {
  'fall-yard': FallYardScene,
  'pumpkin-patch': PumpkinPatchScene,
} as const;

export const DEFAULT_LOOP = 'fall-yard';

export function loopForPath(pathname: string): {
  slug: string;
  scene: (typeof loops)[keyof typeof loops];
} {
  const slug = pathname.replace(/^\/+|\/+$/g, '') || DEFAULT_LOOP;
  const scene = loops[slug as keyof typeof loops];
  if (scene) return { slug, scene };
  return { slug: DEFAULT_LOOP, scene: loops[DEFAULT_LOOP] };
}
