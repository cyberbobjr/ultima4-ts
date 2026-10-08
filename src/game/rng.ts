// Single source of randomness for the engine. Unseeded it uses Math.random; a seed
// (dev: ?seed=N) makes runs reproducible for the headless regression scenarios.
let next: () => number = Math.random;

/** mulberry32: small, fast, good enough for game rolls. */
export function setSeed(seed: number): void {
  let a = seed >>> 0;
  next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [0, 1). */
export const random = (): number => next();
/** Uniform integer in [0, n). */
export const rand = (n: number): number => Math.floor(next() * n);
/** The original's 8-bit random byte (0..255). */
export const rand8 = (): number => rand(256);
