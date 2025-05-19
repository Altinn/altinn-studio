import {
  getCurrentSettingsTab,
  navigateToSettingsTab,
  isValidSettingsTab,
} from './navigationUtils';
import { settingsPageQueryParamKey } from '../AppSettings';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';

describe('settingsTabUtils', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        search: '',
      },
    });
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(jest.clearAllMocks);

  describe('getCurrentSettingsTab', () => {
    it('returns the tab from the query param', () => {
      const expectedTab: SettingsPageTabId = 'about';
      window.location.search = `?${settingsPageQueryParamKey}=${expectedTab}`;
      const result = getCurrentSettingsTab();
      expect(result).toBe(expectedTab);
    });

    it('returns "about" if the query param is missing', () => {
      window.location.search = '';
      const result = getCurrentSettingsTab();
      expect(result).toBe('about');
    });

    it('returns "about" if the query param is null', () => {
      window.location.search = '?otherParam=value';
      const result = getCurrentSettingsTab();
      expect(result).toBe('about');
    });
  });

  describe('navigateToSettingsTab', () => {
    it('updates the URL with the new tab value', () => {
      const newTab: SettingsPageTabId = 'setup';
      window.location.search = '?someParam=123';
      navigateToSettingsTab(newTab);
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set(settingsPageQueryParamKey, newTab);
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', `?${searchParams}`);
    });

    it('replaces existing tab value if present', () => {
      const newTab: SettingsPageTabId = 'policy';
      window.location.search = `?${settingsPageQueryParamKey}=about`;
      navigateToSettingsTab(newTab);
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set(settingsPageQueryParamKey, newTab);
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', `?${searchParams}`);
    });
  });

  describe('isValidSettingsTab', () => {
    const validTabs: SettingsPageTabId[] = ['about', 'setup', 'policy'];

    it('returns true for a valid tab ID', () => {
      expect(isValidSettingsTab('about', validTabs)).toBe(true);
    });

    it('returns false for an invalid tab ID', () => {
      expect(isValidSettingsTab('not-a-tab' as SettingsPageTabId, validTabs)).toBe(false);
    });
  });
});
