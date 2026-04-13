import {
  mapErrorKeyErrorItems,
  appHasCriticalValidationErrors,
  getFieldConfig,
} from './appValidationUtils';

describe('appValidationUtils', () => {
  describe('mapErrorKeyErrorItems', () => {
    it('maps error keys with danger (critical) severity to error items', () => {
      const errorKeys = ['identifier', 'title', 'title.nb', 'title.en'];
      const severity = 'danger';
      const org = 'testOrg';
      const app = 'testApp';
      const t = (key: string) => `translated-${key}`;

      const result = mapErrorKeyErrorItems(errorKeys, severity, org, app, t);

      expect(result).toEqual([
        {
          errorKey: 'identifier',
          search: 'currentTab=about&focus=identifier',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=identifier',
          errorMessage: 'translated-app_validation.app_metadata.identifier.required',
        },
        {
          errorKey: 'title',
          search: 'currentTab=about&focus=title-nb',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-nb',
          errorMessage: 'translated-app_validation.app_metadata.title.required',
        },
        {
          errorKey: 'title.nb',
          search: 'currentTab=about&focus=title-nb',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-nb',
          errorMessage: 'translated-app_validation.app_metadata.title.nb.required',
        },
      ]);
    });

    it('maps error keys with warning (non-critical) severity to error items', () => {
      const errorKeys = ['identifier', 'title', 'title.nb', 'title.en'];
      const severity = 'warning';
      const org = 'testOrg';
      const app = 'testApp';
      const t = (key: string) => `translated-${key}`;

      const result = mapErrorKeyErrorItems(errorKeys, severity, org, app, t);

      expect(result).toEqual([
        {
          errorKey: 'title.en',
          search: 'currentTab=about&focus=title-en',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-en',
          errorMessage: 'translated-app_validation.app_metadata.title.en.required',
        },
      ]);
    });

    it('maps unknown error keys to error items with danger severity', () => {
      const errorKeys = ['unknown_error_key'];
      const severity = 'danger';
      const org = 'testOrg';
      const app = 'testApp';
      const t = (key: string) => `translated-${key}`;

      const result = mapErrorKeyErrorItems(errorKeys, severity, org, app, t);

      expect(result).toEqual([
        {
          errorKey: 'unknown_error_key',
          search: 'currentTab=about&focus=',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=',
          errorMessage: 'translated-unknown_error_key',
        },
      ]);
    });

    it('ignores unknown error keys for warning severity', () => {
      const errorKeys = ['unknown_error_key'];
      const severity = 'warning';
      const org = 'testOrg';
      const app = 'testApp';
      const t = (key: string) => `translated-${key}`;

      const result = mapErrorKeyErrorItems(errorKeys, severity, org, app, t);

      expect(result).toEqual([]);
    });
  });

  describe('appHasCriticalValidationErrors', () => {
    it('returns true if there are critical error keys', () => {
      const errorKeys = ['identifier', 'title', 'title.en'];
      expect(appHasCriticalValidationErrors(errorKeys)).toBe(true);
    });

    it('returns true if there are unknown error keys', () => {
      const errorKeys = ['unknown_error_key'];
      expect(appHasCriticalValidationErrors(errorKeys)).toBe(true);
    });

    it('returns false if there are no critical error keys', () => {
      const errorKeys = ['title.en'];
      expect(appHasCriticalValidationErrors(errorKeys)).toBe(false);
    });

    it('returns false if there are no error keys', () => {
      const errorKeys: string[] = [];
      expect(appHasCriticalValidationErrors(errorKeys)).toBe(false);
    });
  });

  describe('getFieldConfig', () => {
    it('returns the correct field config for known error keys', () => {
      expect(getFieldConfig('identifier')).toEqual({
        anchor: 'identifier',
        translationKey: 'app_validation.app_metadata.identifier.required',
        critical: true,
      });
      expect(getFieldConfig('title')).toEqual({
        anchor: 'title-nb',
        translationKey: 'app_validation.app_metadata.title.required',
        critical: true,
      });
      expect(getFieldConfig('title.nb')).toEqual({
        anchor: 'title-nb',
        translationKey: 'app_validation.app_metadata.title.nb.required',
        critical: true,
      });
      expect(getFieldConfig('title.en')).toEqual({
        anchor: 'title-en',
        translationKey: 'app_validation.app_metadata.title.en.required',
        critical: false,
      });
    });

    it('returns undefined for unknown error keys', () => {
      expect(getFieldConfig('unknown_error_key')).toBeUndefined();
    });
  });
});
