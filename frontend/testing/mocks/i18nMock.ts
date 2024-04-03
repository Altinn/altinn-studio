import type i18next from 'i18next';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const mockUseTranslation = (texts: { [key: string]: string } = {}) => ({
  t: ((key: string) => texts[key] ?? key) as typeof i18next.t,
});

export const textMock = ((keys: string | string[], variables?: KeyValuePairs<string>) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
}) as typeof i18next.t;
