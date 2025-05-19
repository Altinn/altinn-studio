import React from 'react';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import {
  getCurrentSettingsTab,
  navigateToSettingsTab,
  isValidSettingsTab,
  settingsPageQueryParamKey,
  getAllSettingsPageTabIds,
} from './utils';
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

  describe('getAllSettingsPageTabIds', () => {
    it('should extract tabIds from tab array', () => {
      const mockTabs: StudioContentMenuButtonTabProps<SettingsPageTabId>[] = [
        { tabId: 'about', tabName: 'About', icon: <svg /> },
        { tabId: 'setup', tabName: 'Setup', icon: <svg /> },
        { tabId: 'policy', tabName: 'Policy', icon: <svg /> },
      ];

      const result = getAllSettingsPageTabIds(mockTabs);
      expect(result).toEqual(['about', 'setup', 'policy']);
    });

    it('should return an empty array if given an empty array', () => {
      const result = getAllSettingsPageTabIds([]);
      expect(result).toEqual([]);
    });
  });

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
