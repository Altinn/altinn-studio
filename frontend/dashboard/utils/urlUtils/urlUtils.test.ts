import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import {
  extractLastRouterParam,
  extractSecondLastRouterParam,
  getAppDevelopmentRootRoute,
  getRepoEditUrl,
} from './urlUtils';

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

  describe('getRepoEditUrl', () => {
    it('should return url to dataModelling when repo name matches "<org>-datamodels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-datamodels',
      });

      expect(result).toBe(`${APP_DEVELOPMENT_BASENAME}/org-name/org-name-datamodels/data-model`);
    });

    it('should not return url to dataModelling when repo name does not match "<org>-dataModels"', () => {
      const result = getRepoEditUrl({
        org: 'org-name',
        repo: 'org-name-data-models-not',
      });

      expect(result).not.toContain('#/datamodel/');
      expect(result).toContain(APP_DEVELOPMENT_BASENAME);
    });
  });

  describe('extractLastRouterParam', () => {
    it('should return the last part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = extractLastRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = extractLastRouterParam(pathname);
      expect(result).toBe('profile');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = extractLastRouterParam(pathname);
      expect(result).toBe('');
    });
  });

  describe('extractSecondLastRouterParam', () => {
    it('should return the second last part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('user');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
    });
  });
});
