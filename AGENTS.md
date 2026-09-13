# Agent guidelines

## Stack

Phaser 4 (`phaser@4.2.1`), Vite, TypeScript, pnpm.

## Package manager

Use pnpm at the repo root (not npm or yarn).

## Prefer little code

Meet the acceptance criteria in as little code as possible. No speculative layers.

## No unit test frameworks

Do not add Jest/Vitest/Playwright. Use a tiny `node scripts/*.mjs` assert script if a check is needed.

## Scene colocation

Loop-only helpers sit next to the scene under `src/scenes/`. Shared systems in `src/systems/`, data in `src/data/`.

## Local only

No deploy, Netlify, analytics, install gate, or save system.

## Animation

Do not create sprite maps or spritesheets. Use a single still frame and animate it in Phaser (tweens on position, scale, rotation, alpha, tint).
