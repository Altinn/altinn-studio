import { describe, expect, it } from 'vitest';
import { getAppDevelopmentRootRoute } from './';

describe('urlUtils', () => {
  describe('applicationAboutPage', () => {
    it('should return url to about page', () => {
      const result = getAppDevelopmentRootRoute({
        org: 'org-name',
        repo: 'app-name',
      });

      expect(result).toEqual('http://localhost/editor/org-name/app-name/');
    });
  });
});
