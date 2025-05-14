import {
  customEncodeURI,
  getMessageBoxUrl,
  getUrlWithLanguage,
  logoutUrlAltinn,
  makeUrlRelativeIfSameDomain,
  returnBaseUrlToAltinn,
  returnUrlToAllForms,
  returnUrlToArchive,
  returnUrlToProfile,
} from 'src/utils/urls/urlHelper';

const hostTT = 'ttd.apps.tt02.altinn.no';
const hostAT = 'ttd.apps.at21.altinn.cloud';
const hostYT = 'ttd.apps.yt01.altinn.cloud';
const hostProd = 'ttd.apps.altinn.no';
const hostDocker = 'local.altinn.cloud';
const hostPodman = 'local.altinn.cloud:8000';
const hostStudio = 'altinn.studio';
const hostStudioDev = 'dev.altinn.studio';
const hostUnknown = 'www.vg.no';

describe('Shared urlHelper.ts', () => {
  test('returnUrlToMessageBox() returning correct environemnts', () => {
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostTT } as Location);
    expect(getMessageBoxUrl()).toBe('https://tt02.altinn.no/ui/messagebox');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostAT } as Location);
    expect(getMessageBoxUrl()).toBe('https://at21.altinn.cloud/ui/messagebox');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostYT } as Location);
    expect(getMessageBoxUrl()).toBe('https://yt01.altinn.cloud/ui/messagebox');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostProd } as Location);
    expect(getMessageBoxUrl()).toBe('https://altinn.no/ui/messagebox');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostDocker } as Location);
    expect(getMessageBoxUrl()).toBe('http://local.altinn.cloud/');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostPodman } as Location);
    expect(getMessageBoxUrl()).toBe('http://local.altinn.cloud:8000/');
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostStudio } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostStudioDev } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
    jest.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostUnknown } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
  });

  test('returnBaseUrlToAltinn() returning correct environemnts', () => {
    expect(returnBaseUrlToAltinn(hostTT)).toBe('https://tt02.altinn.no/');
    expect(returnBaseUrlToAltinn(hostAT)).toBe('https://at21.altinn.cloud/');
    expect(returnBaseUrlToAltinn(hostYT)).toBe('https://yt01.altinn.cloud/');
    expect(returnBaseUrlToAltinn(hostProd)).toBe('https://altinn.no/');
    expect(returnBaseUrlToAltinn(hostDocker)).toBe(undefined);
    expect(returnBaseUrlToAltinn(hostPodman)).toBe(undefined);
    expect(returnBaseUrlToAltinn(hostStudio)).toBe(undefined);
    expect(returnBaseUrlToAltinn(hostStudioDev)).toBe(undefined);
    expect(returnBaseUrlToAltinn(hostUnknown)).toBe(undefined);
  });

  test('returnUrlTProfile() returning correct environments', () => {
    expect(returnUrlToProfile(hostTT)).toBe('https://tt02.altinn.no/ui/profile');
    expect(returnUrlToProfile(hostAT)).toBe('https://at21.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(hostYT)).toBe('https://yt01.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(hostProd)).toBe('https://altinn.no/ui/profile');
    expect(returnUrlToProfile(hostDocker)).toBe('http://local.altinn.cloud/');
    expect(returnUrlToProfile(hostPodman)).toBe('http://local.altinn.cloud:8000/');
    expect(returnUrlToProfile(hostStudio)).toBe(undefined);
    expect(returnUrlToProfile(hostStudioDev)).toBe(undefined);
    expect(returnUrlToProfile(hostUnknown)).toBe(undefined);
  });

  test('returnUrlAllForms() returning correct environments', () => {
    expect(returnUrlToAllForms(hostTT)).toBe('https://tt02.altinn.no/skjemaoversikt');
    expect(returnUrlToAllForms(hostAT)).toBe('https://at21.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllForms(hostYT)).toBe('https://yt01.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllForms(hostProd)).toBe('https://altinn.no/skjemaoversikt');
    expect(returnUrlToAllForms(hostDocker)).toBe('http://local.altinn.cloud/');
    expect(returnUrlToAllForms(hostPodman)).toBe('http://local.altinn.cloud:8000/');
    expect(returnUrlToAllForms(hostStudio)).toBe(undefined);
    expect(returnUrlToAllForms(hostStudioDev)).toBe(undefined);
    expect(returnUrlToAllForms(hostUnknown)).toBe(undefined);
  });

  test('returnUrlToArchive() returning correct environments', () => {
    expect(returnUrlToArchive(hostTT)).toBe('https://tt02.altinn.no/ui/messagebox/archive');
    expect(returnUrlToArchive(hostAT)).toBe('https://at21.altinn.cloud/ui/messagebox/archive');
    expect(returnUrlToArchive(hostYT)).toBe('https://yt01.altinn.cloud/ui/messagebox/archive');
    expect(returnUrlToArchive(hostProd)).toBe('https://altinn.no/ui/messagebox/archive');
    expect(returnUrlToArchive(hostDocker)).toBe('http://local.altinn.cloud/');
    expect(returnUrlToArchive(hostPodman)).toBe('http://local.altinn.cloud:8000/');
    expect(returnUrlToArchive(hostStudio)).toBe(undefined);
    expect(returnUrlToArchive(hostStudioDev)).toBe(undefined);
    expect(returnUrlToArchive(hostUnknown)).toBe(undefined);
  });

  test('logoutUrlAltinn() returning correct environments', () => {
    expect(logoutUrlAltinn(hostTT)).toBe('https://tt02.altinn.no/ui/authentication/LogOut');
    expect(logoutUrlAltinn(hostAT)).toBe('https://at21.altinn.cloud/ui/authentication/LogOut');
    expect(logoutUrlAltinn(hostYT)).toBe('https://yt01.altinn.cloud/ui/authentication/LogOut');
    expect(logoutUrlAltinn(hostProd)).toBe('https://altinn.no/ui/authentication/LogOut');
    expect(logoutUrlAltinn(hostDocker)).toBe('http://local.altinn.cloud/');
    expect(logoutUrlAltinn(hostPodman)).toBe('http://local.altinn.cloud:8000/');
    expect(logoutUrlAltinn(hostStudio)).toBe(undefined);
    expect(logoutUrlAltinn(hostStudioDev)).toBe(undefined);
    expect(logoutUrlAltinn(hostUnknown)).toBe(undefined);
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
