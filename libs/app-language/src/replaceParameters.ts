/** A parameter value that can be substituted into a translation string. */
export type SimpleLangParam = string | number | undefined;

/**
 * Substitutes positional placeholders (`{0}`, `{1}`, ...) in a translation string with the given
 * params, where the index in the params array maps to the placeholder number. Only `string` and
 * `number` params are substituted; any other value leaves its placeholder untouched.
 */
export function replaceParameters(nameString: string, params: SimpleLangParam[]): string {
  let mutatingString = nameString;
  params.forEach((param, index) => {
    if (typeof param === 'string' || typeof param === 'number') {
      const paramAsString = String(param);
      // Use a replacer function so the param value is inserted verbatim; a plain replacement string
      // would interpret `$`-tokens (`$&`, `$$`, `$1`, ...) instead of treating them as literal data.
      mutatingString = mutatingString.replaceAll(`{${index}}`, () => paramAsString);
    }
  });

  return mutatingString;
}
