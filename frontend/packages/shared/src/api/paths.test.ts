import { repoDownloadPath } from './paths';

describe('paths', () => {
  test('Params works as intended', () => {
    const url = repoDownloadPath('org', 'app', true);
    expect(url.endsWith('full=true')).toBeTruthy();
  });
});
