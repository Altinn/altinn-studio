import { altinnDocsUrl } from './ext-urls';

describe('altinnDocsUrl', () => {
  it('should return the URL with the default language "nb" when no language is provided', () => {
    const result = altinnDocsUrl();
    expect(result).toBe('https://docs.altinn.studio/nb/');
  });

  it('should return the URL with the provided relativeUrl and default language "nb"', () => {
    const result = altinnDocsUrl({ relativeUrl: 'getting-started' });
    expect(result).toBe('https://docs.altinn.studio/nb/getting-started');
  });

  it('should return the URL with language "nb" and relativeUrl', () => {
    const result = altinnDocsUrl({ relativeUrl: 'guide/overview', language: 'nb' });
    expect(result).toBe('https://docs.altinn.studio/nb/guide/overview');
  });

  it('should return the URL with language "en" and relativeUrl without the language in the URL path', () => {
    const result = altinnDocsUrl({ relativeUrl: 'guide/overview', language: 'en' });
    expect(result).toBe('https://docs.altinn.studio/guide/overview');
  });

  it('should return the URL with language "en" and no relativeUrl', () => {
    const result = altinnDocsUrl({ language: 'en' });
    expect(result).toBe('https://docs.altinn.studio/');
  });
});
