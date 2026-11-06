export const SCREEN_STAMP = "m13";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
