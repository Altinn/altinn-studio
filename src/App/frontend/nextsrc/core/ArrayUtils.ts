/**
 * Returns a reversed copy of the array without mutating the original.
 * Returns undefined if the input is undefined.
 */
export function safeReverse<T>(arr: T[] | undefined): T[] | undefined {
  return arr ? [...arr].reverse() : undefined;
}