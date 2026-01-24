export function isNotNullUndefinedOrEmpty(key: string | number | boolean | null | undefined) {
  return key != null && (typeof key !== 'string' || !!key.length);
}
