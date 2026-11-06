export const SCREEN_STAMP = "m11";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
