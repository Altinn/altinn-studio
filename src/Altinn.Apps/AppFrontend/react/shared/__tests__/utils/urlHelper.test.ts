import 'jest';
import { returnUrlToMessagebox } from './../../src/utils/urlHelper';

describe('Shared urlHelper.ts', () => {
  test('returnUrlToMessagebox() returning production messagebox', () => {
    const origin = 'https://tdd.apps.altinn.no/tdd/myappname';
    expect(returnUrlToMessagebox(origin)).toContain('altinn.no');
  });

  test('returnUrlToMessagebox() returning at21 messagebox', () => {
    const origin = 'https://tdd.apps.at21.altinn.cloud/tdd/myappname';
    expect(returnUrlToMessagebox(origin)).toContain('at21.altinn.cloud');
  });

  test('returnUrlToMessagebox() returning studio messagebox', () => {
    const origin = 'http://altinn3.no/tdd/tjeneste-20190826-1130';
    expect(returnUrlToMessagebox(origin)).toContain('altinn3.no');
  });

  test('returnUrlToMessagebox() returning null when unknown origin', () => {
    const origin = 'http://www.vg.no';
    expect(returnUrlToMessagebox(origin)).toBe(null);
  });

  test('returnUrlToMessagebox() returning tt02 messagebox', () => {
    const origin = 'http://altinn3.no/tdd/tjeneste-20190826-1130';
    expect(returnUrlToMessagebox(origin)).toContain('tt02.altinn.no');
  });
});
