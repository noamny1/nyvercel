export const SCREEN_STAMP = "m3";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
