import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC: string = join(__dirname, '..');
const TOKENS: string = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** The `--name: #hex` pairs of one block of tokens.css (the light one, or the dark one inside `@media`). */
function colorsOf(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((match) => [match[1], match[2]]));
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const DARK_MARKER = ":root[data-theme='dark']";
const [LIGHT, DARK] = [TOKENS.split(DARK_MARKER)[0], TOKENS.split(DARK_MARKER)[1]];

/** Every text color against the background it is drawn on. AA needs 4.5:1. */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-text-muted', 'color-bg'],
  ['color-text-muted', 'color-surface'],
  ['color-text-muted', 'color-surface-muted'],
  ['color-accent', 'color-surface'],
  ['color-accent', 'color-bg'],
  ['color-on-accent', 'color-accent'],
  ['color-on-accent', 'color-accent-strong'],
  ['color-on-accent-soft', 'color-accent-soft'],
  ['color-on-success-soft', 'color-success-soft'],
  ['color-on-danger-soft', 'color-danger-soft'],
  ['color-on-neutral-soft', 'color-neutral-soft'],
  ['color-accent', 'color-surface-muted'],
  ['color-accent', 'color-accent-soft'],
  ['color-on-bar', 'color-bar-bg'],
  ['color-on-bar', 'color-bar-hover'],
  ['color-on-bar-muted', 'color-bar-bg'],
  ['color-on-bar-muted', 'color-bar-hover'],
  ['color-on-header', 'color-header-bg'],
  ['color-on-header', 'color-header-hover'],
  ['color-on-header-muted', 'color-header-bg'],
  ['color-on-hero', 'color-hero-bg'],
  ['color-on-hero-muted', 'color-hero-bg'],
];

describe('design tokens', () => {
  it.each([
    ['light', colorsOf(LIGHT)],
    ['dark', { ...colorsOf(LIGHT), ...colorsOf(DARK) }],
  ])('keeps every text pair at AA (4.5:1) in the %s theme', (_theme, colors) => {
    for (const [foreground, background] of PAIRS) {
      expect(contrast(colors[foreground], colors[background]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('is the only place a hex color is written', () => {
    const offenders = filesUnder(SRC)
      .filter((path) => /\.(css|tsx?)$/.test(path) && !path.endsWith('tokens.css') && !path.endsWith('tokens.test.ts'))
      .filter((path) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(path, 'utf8')));

    expect(offenders).toEqual([]);
  });
});
