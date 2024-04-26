import {
  customEncodeURI,
  getUrlWithLanguage,
  logoutUrlAltinn,
  makeUrlRelativeIfSameDomain,
  returnBaseUrlToAltinn,
  returnUrlToAllSchemas,
  returnUrlToMessagebox,
  returnUrlToProfile,
} from 'src/utils/urls/urlHelper';

describe('Shared urlHelper.ts', () => {
  test('returnUrlToMessagebox() returning production messagebox', () => {
    const origin = 'https://tdd.apps.altinn.no/tdd/myappname';
    expect(returnUrlToMessagebox(origin)).toContain('altinn.no');
  });

  test('returnUrlToMessagebox() returning at21 messagebox', () => {
    const origin = 'https://tdd.apps.at21.altinn.cloud/tdd/myappname';
    expect(returnUrlToMessagebox(origin)).toContain('at21.altinn.cloud');
  });

  test('returnUrlToMessagebox() returning tt02 messagebox', () => {
    const origin = 'https://tdd.apps.tt02.altinn.no/tdd/myappname';
    expect(returnUrlToMessagebox(origin)).toContain('tt02.altinn.no');
  });

  test('returnUrlToMessagebox() returning null when unknown origin', () => {
    const origin = 'https://www.vg.no';
    expect(returnUrlToMessagebox(origin)).toBe(null);
  });

  test('returnBaseUrlToAltinn() returning correct environemnts', () => {
    const originTT = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'https://www.vg.no';
    expect(returnBaseUrlToAltinn(originTT)).toContain('tt02.altinn.no');
    expect(returnBaseUrlToAltinn(originAT)).toContain('at21.altinn.cloud');
    expect(returnBaseUrlToAltinn(originYT)).toContain('yt01.altinn.cloud');
    expect(returnBaseUrlToAltinn(originProd)).toContain('altinn.no');
    expect(returnBaseUrlToAltinn(originUnknown)).toBe(null);
  });

  test('returnUrlTProfile() returning correct environments', () => {
    const originTT = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'https://www.vg.no';
    expect(returnUrlToProfile(originTT)).toContain('tt02.altinn.no/ui/profile');
    expect(returnUrlToProfile(originAT)).toContain('at21.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(originYT)).toContain('yt01.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(originProd)).toContain('altinn.no/ui/profile');
    expect(returnUrlToProfile(originUnknown)).toBe(null);
  });

  test('returnUrlAllSchemas() returning correct environments', () => {
    const originTT = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'https://www.vg.no';
    expect(returnUrlToAllSchemas(originTT)).toContain('tt02.altinn.no/skjemaoversikt');
    expect(returnUrlToAllSchemas(originAT)).toContain('at21.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllSchemas(originYT)).toContain('yt01.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllSchemas(originProd)).toContain('altinn.no/skjemaoversikt');
    expect(returnUrlToAllSchemas(originUnknown)).toBe(null);
  });

  test('customEncodeURI() returning correct encoding', () => {
    const uri1 = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const uri2 = 'attachment [example].png';
    const uri3 = 'attachment (example).gif';
    const uri4 = 'attachment (example) (1) (2).gif';
    expect(customEncodeURI(uri1)).toBe('https%3A%2F%2Fttd.apps.tt02.altinn.no%2Ftdd%2Ftjeneste-20190826-1130');
    expect(customEncodeURI(uri2)).toBe('attachment%20%5Bexample%5D.png');
    expect(customEncodeURI(uri3)).toBe('attachment%20%28example%29.gif');
    expect(customEncodeURI(uri4)).toBe('attachment%20%28example%29%20%281%29%20%282%29.gif');
  });

  test('logoutUrlAltinn() should return correct url for each env.', () => {
    const originTT = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    expect(logoutUrlAltinn(originTT)).toContain('tt02.altinn.no/ui/authentication/LogOut');
    expect(logoutUrlAltinn(originAT)).toContain('at21.altinn.cloud/ui/authentication/LogOut');
    expect(logoutUrlAltinn(originYT)).toContain('yt01.altinn.cloud/ui/authentication/LogOut');
    expect(logoutUrlAltinn(originProd)).toContain('altinn.no/ui/authentication/LogOut');
  });

  test('makeUrlRelativeIfSameDomain()', () => {
    // Simple testcase make relative
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no/asdf', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/asdf');
    // Simple testcase domains don't match
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no/asdf', {
        hostname: 'altinn3localno',
      } as Location),
    ).toBe('https://altinn3local.no/asdf');
    // Test with dummyurl
    expect(
      makeUrlRelativeIfSameDomain('dummyurl', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('dummyurl');

    // Test with non-standard port
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
  });

  describe('getUrlWithLanguage', () => {
    const testCases = [
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true',
        language: 'nb',
        expected:
          'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true&language=nb',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
        language: 'en',
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
        language: 'nb',
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=nb',
      },
      {
        url: undefined,
        language: 'nb',
        expected: undefined,
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=nb&includeRowId=true',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
      },
    ];
    it.each(testCases)('url: $url, language: $language should result in $expected', ({ url, language, expected }) => {
      expect(getUrlWithLanguage(url, language)).toBe(expected);
    });
  });
});
