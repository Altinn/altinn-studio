import i18next from 'i18next';

export const mockUseTranslation = (texts: {[key: string]: string} = {}) => ({
  t: ((key: string) => texts[key] ?? key) as typeof i18next.t,
});

export const textMock = (key: string) => '[mockedText(' + key + ')]';
