import type i18next from 'i18next';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const mockUseTranslation = (texts: { [key: string]: string } = {}) => ({
  t: ((key: string) => texts[key] ?? key) as typeof i18next.t,
});

export const textMock = ((key: string, variables?: KeyValuePairs<string>) =>
  variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]') as typeof i18next.t;
