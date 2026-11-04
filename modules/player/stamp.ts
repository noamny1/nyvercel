export const SCREEN_STAMP = "m4";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
