import 'jest';
import {
  returnUrlToMessagebox,
  returnBaseUrlToAltinn,
  logoutUrlAltinn,
  makeUrlRelativeIfSameDomain,
} from './urlHelper';

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
    const originTT =
      'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT =
      'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT =
      'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'https://www.vg.no';
    expect(returnBaseUrlToAltinn(originTT)).toContain('tt02.altinn.no');
    expect(returnBaseUrlToAltinn(originAT)).toContain('at21.altinn.cloud');
    expect(returnBaseUrlToAltinn(originYT)).toContain('yt01.altinn.cloud');
    expect(returnBaseUrlToAltinn(originProd)).toContain('altinn.no');
    expect(returnBaseUrlToAltinn(originUnknown)).toBe(null);
  });

  test('logoutUrlAltinn() should return correct url for each env.', () => {
    const originTT =
      'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT =
      'https://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT =
      'https://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'https://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    expect(logoutUrlAltinn(originTT)).toContain(
      'tt02.altinn.no/ui/authentication/LogOut',
    );
    expect(logoutUrlAltinn(originAT)).toContain(
      'at21.altinn.cloud/ui/authentication/LogOut',
    );
    expect(logoutUrlAltinn(originYT)).toContain(
      'yt01.altinn.cloud/ui/authentication/LogOut',
    );
    expect(logoutUrlAltinn(originProd)).toContain(
      'altinn.no/ui/authentication/LogOut',
    );
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
      makeUrlRelativeIfSameDomain('http://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
    expect(
      makeUrlRelativeIfSameDomain('http://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
  });
});
