export const SCREEN_STAMP = "m6";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
