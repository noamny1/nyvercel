export const SCREEN_STAMP = "m9";

export function screenToken(revision: number) {
  return `${revision}-${SCREEN_STAMP}`;
}
