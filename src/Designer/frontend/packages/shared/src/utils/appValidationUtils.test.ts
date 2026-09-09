import {
  mapErrorKeyErrorItems,
  appHasCriticalValidationErrors,
  getAppValidationSummary,
  getFieldConfig,
  groupValidationItemsByArea,
} from './appValidationUtils';
import type { ErrorItem } from './appValidationUtils';

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
          area: 'settings',
        },
        {
          errorKey: 'title',
          search: 'currentTab=about&focus=title-nb',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-nb',
          errorMessage: 'translated-app_validation.app_metadata.title.required',
          area: 'settings',
        },
        {
          errorKey: 'title.nb',
          search: 'currentTab=about&focus=title-nb',
          fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-nb',
          errorMessage: 'translated-app_validation.app_metadata.title.nb.required',
          area: 'settings',
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
          area: 'settings',
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
          area: 'other',
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

  describe('getAppValidationSummary', () => {
    const org = 'testOrg';
    const app = 'testApp';
    const t = (key: string) => `translated-${key}`;

    it('splits the error keys into errors and warnings', () => {
      const { errorItems, warningItems } = getAppValidationSummary(
        ['title.nb', 'title.en'],
        org,
        app,
        t,
      );
      expect(errorItems.map((errorItem) => errorItem.errorKey)).toEqual(['title.nb']);
      expect(warningItems.map((warningItem) => warningItem.errorKey)).toEqual(['title.en']);
    });

    it('groups the items by the area they belong to', () => {
      const { areaGroups } = getAppValidationSummary(
        ['title.nb', 'unknown_error_key'],
        org,
        app,
        t,
      );
      expect(areaGroups.map((areaGroup) => areaGroup.area)).toEqual(['settings', 'other']);
    });

    it('returns no area groups when there are no error keys', () => {
      const { errorItems, warningItems, areaGroups } = getAppValidationSummary([], org, app, t);
      expect(errorItems).toEqual([]);
      expect(warningItems).toEqual([]);
      expect(areaGroups).toEqual([]);
    });
  });

  describe('groupValidationItemsByArea', () => {
    const settingsError: ErrorItem = {
      errorKey: 'title.nb',
      search: 'currentTab=about&focus=title-nb',
      fullHref: '/editor/testOrg/testApp/app-settings?currentTab=about&focus=title-nb',
      errorMessage: 'translated-app_validation.app_metadata.title.nb.required',
      area: 'settings',
    };
    const settingsWarning: ErrorItem = { ...settingsError, errorKey: 'title.en', area: 'settings' };
    const unknownError: ErrorItem = { ...settingsError, errorKey: 'unknown', area: 'other' };

    it('returns the areas with items in a fixed order', () => {
      const groups = groupValidationItemsByArea([unknownError, settingsError], []);
      expect(groups.map((group) => group.area)).toEqual(['settings', 'other']);
    });

    it('returns the translation key for the page each area belongs to', () => {
      const groups = groupValidationItemsByArea([settingsError, unknownError], []);
      expect(groups.map((group) => group.areaNameKey)).toEqual([
        'app_settings.heading',
        'app_validation.area_other',
      ]);
    });

    it('returns no groups when there are no items', () => {
      expect(groupValidationItemsByArea([], [])).toEqual([]);
    });

    it('places errors and warnings in the group of their area', () => {
      const groups = groupValidationItemsByArea([settingsError, unknownError], [settingsWarning]);
      const settingsGroup = groups.find((group) => group.area === 'settings');
      const otherGroup = groups.find((group) => group.area === 'other');
      expect(settingsGroup.errorItems).toEqual([settingsError]);
      expect(settingsGroup.warningItems).toEqual([settingsWarning]);
      expect(otherGroup.errorItems).toEqual([unknownError]);
      expect(otherGroup.warningItems).toEqual([]);
    });

    it('omits areas without items', () => {
      const groups = groupValidationItemsByArea([settingsError], []);
      expect(groups.map((group) => group.area)).toEqual(['settings']);
    });
  });

  describe('getFieldConfig', () => {
    it('returns the correct field config for known error keys', () => {
      expect(getFieldConfig('identifier')).toEqual({
        anchor: 'identifier',
        translationKey: 'app_validation.app_metadata.identifier.required',
        critical: true,
        area: 'settings',
      });
      expect(getFieldConfig('title')).toEqual({
        anchor: 'title-nb',
        translationKey: 'app_validation.app_metadata.title.required',
        critical: true,
        area: 'settings',
      });
      expect(getFieldConfig('title.nb')).toEqual({
        anchor: 'title-nb',
        translationKey: 'app_validation.app_metadata.title.nb.required',
        critical: true,
        area: 'settings',
      });
      expect(getFieldConfig('title.en')).toEqual({
        anchor: 'title-en',
        translationKey: 'app_validation.app_metadata.title.en.required',
        critical: false,
        area: 'settings',
      });
    });

    it('returns undefined for unknown error keys', () => {
      expect(getFieldConfig('unknown_error_key')).toBeUndefined();
    });
  });
});
