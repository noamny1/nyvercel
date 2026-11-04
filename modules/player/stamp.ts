export const SCREEN_STAMP = "m7";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
