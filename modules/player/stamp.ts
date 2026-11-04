export const SCREEN_STAMP = "m8";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
