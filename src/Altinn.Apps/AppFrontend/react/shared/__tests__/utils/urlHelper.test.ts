import 'jest';
import { returnUrlToMessagebox, returnUrlToProfile, returnUrlToAllSchemas, returnBaseUrlToAltinn } from '../../src/utils/urlHelper';

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
    const origin = 'http://www.vg.no';
    expect(returnUrlToMessagebox(origin)).toBe(null);
  });

  test('returnBaseUrlToAltinn() returning correct environemnts', () => {
    const originTT = 'http://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'http://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'http://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'http://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'http://www.vg.no';
    expect(returnBaseUrlToAltinn(originTT)).toContain('tt02.altinn.no');
    expect(returnBaseUrlToAltinn(originAT)).toContain('at21.altinn.cloud');
    expect(returnBaseUrlToAltinn(originYT)).toContain('yt01.altinn.cloud');
    expect(returnBaseUrlToAltinn(originProd)).toContain('altinn.no');
    expect(returnBaseUrlToAltinn(originUnknown)).toBe(null);

  });

  test('returnUrlTProfile() returning correct environments', () => {
    const originTT = 'http://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'http://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'http://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'http://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'http://www.vg.no';
    expect(returnUrlToProfile(originTT)).toContain('tt02.altinn.no/ui/profile');
    expect(returnUrlToProfile(originAT)).toContain('at21.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(originYT)).toContain('yt01.altinn.cloud/ui/profile');
    expect(returnUrlToProfile(originProd)).toContain('altinn.no/ui/profile');
    expect(returnUrlToProfile(originUnknown)).toBe(null);
  });

  test('returnUrlAllSchemas() returning correct environments', () => {
    const originTT = 'http://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const originAT = 'http://ttd.apps.at21.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originYT = 'http://ttd.apps.yt01.altinn.cloud/tdd/tjeneste-20190826-1130';
    const originProd = 'http://ttd.apps.altinn.no/tdd/tjeneste-20190826-1130';
    const originUnknown = 'http://www.vg.no';
    expect(returnUrlToAllSchemas(originTT)).toContain('tt02.altinn.no/skjemaoversikt');
    expect(returnUrlToAllSchemas(originAT)).toContain('at21.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllSchemas(originYT)).toContain('yt01.altinn.cloud/skjemaoversikt');
    expect(returnUrlToAllSchemas(originProd)).toContain('altinn.no/skjemaoversikt');
    expect(returnUrlToAllSchemas(originUnknown)).toBe(null);
  });
});