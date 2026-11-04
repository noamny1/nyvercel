export const SCREEN_STAMP = "m5";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
