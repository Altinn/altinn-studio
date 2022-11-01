let uniqueIdNumber = 0;
/**
 * Generates a unique text that can be used as an Element-ID from the string input:
 * Automatically forces lower-case
 * Removes #-tags
 * Removes spaces characters conflicting with css etc. with a dash (-)
 * Adds a suffix with a number that has yet been used
 * It also removes unsupported characters and replaces them with a dash (-) and replaces whitespace with underscore (_).
 * */
export const getDomFriendlyID = (
  baseId: string,
  options: {
    suffix?: string;
    reset?: boolean;
  } = {},
): string => {
  const { reset, ...restOptions } = options;
  if (reset) {
    uniqueIdNumber = 0;
    return getDomFriendlyID(baseId, restOptions);
  }
  const suffix = options?.suffix ? `-${options.suffix}` : '';
  const rawId = `${baseId}${suffix}-${uniqueIdNumber++}`.toLowerCase();
  return rawId
    .replace(/#/g, '')
    .replace(/[^a-z0-9/\s]/g, '-')
    .replace(/\s/g, '_');
};

export const isValidName = (name: string) => Boolean(name.match(/^[a-zA-ZæÆøØåÅ][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));
