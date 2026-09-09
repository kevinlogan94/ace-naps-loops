# Ace Naps Loops

Local studio for pixel-art **Calm-by-Nature** style loops starring Ace (`Ace_naps`). This is not a game people play. You run a scene locally, record it, and post the video to YouTube.

## Stack

Phaser 4.2 + Vite + pnpm. Local only. Record with the Mac screenshot toolbar.

## First video

**Fall yard**, a 15 minute story loop. Paste it 3 times in the editor for about 45 minutes.

The hunt lives in the YouTube description (8 items). It is not in-engine.

## How to run

```bash
pnpm install
pnpm dev
# http://localhost:5174/
```

## Query params

| Param | Example | What it does |
| --- | --- | --- |
| `video` | `?video=fall-yard` | Which loop to load |
| `speed` | `?speed=60` | Fast-forwards the **event clock** only |

Record at `speed=1`. Higher speed is for previewing timed events, not for the capture.

## Recording

1. Open the page in a 16:9 window (up to 1920x1080). The scene is 480x270, scaled with FIT.
2. Use `speed=1`.
3. Mac screen record for about 15 minutes.
4. Duplicate that clip 3 times.
5. Add music later.

## Art

Autumn yard uses ElizaWy terrain, house, and wildflowers. Kevin, Ace, the witch, trees, and falling leaves are custom pixel sheets.

## Ace

Always visible in video 1. White/tan Ace with a blue collar, napping in the yard. Ace is **not** on the hunt list.

## Hunt list (YouTube description)

Always on screen:

- Pumpkin by the house
- Red mushroom
- Scarecrow
- Ace's tennis ball
- Letter at the door

Timed (appear on the event clock):

- Crow
- Lit lantern
- Witch
