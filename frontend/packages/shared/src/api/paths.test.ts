import { repoDownloadPath } from './paths';
import { app, org } from '@studio/testing/testids';

describe('paths', () => {
  test('Params works as intended', () => {
    const url = repoDownloadPath(org, app, true);
    expect(url.endsWith('full=true')).toBeTruthy();
  });
});
