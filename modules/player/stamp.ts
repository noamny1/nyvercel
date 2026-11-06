export const SCREEN_STAMP = "m10";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
