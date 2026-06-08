/** A parameter value that can be substituted into a translation string. */
export type SimpleLangParam = string | number | undefined;

/**
 * Substitutes positional placeholders (`{0}`, `{1}`, ...) in a translation string with the given
 * params, where the index in the params array maps to the placeholder number. Only `string` and
 * `number` params are substituted; any other value leaves its placeholder untouched.
 *
 * Shared by the app frontend and Storybook so both render translated text identically.
 */
export function replaceParameters(nameString: string, params: SimpleLangParam[]): string {
  let mutatingString = nameString;
  for (const index in params) {
    const param = params[index];
    let paramAsString: string | undefined;
    if (typeof param === 'string') {
      paramAsString = param;
    } else if (typeof param === 'number') {
      paramAsString = param.toString();
    }

    if (paramAsString !== undefined) {
      mutatingString = mutatingString.replaceAll(`{${index}}`, paramAsString);
    }
  }

  return mutatingString;
}
