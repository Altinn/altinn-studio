/**
 * Use to narrow anything into a boolean.
 * Useful for e.g. filtering out falsy values and keeping the type.
 */
export function typedBoolean<T>(value: T): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value);
}
