import React from 'react';
import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { getIsActiveTab, createNavigationTab } from './index';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';

const mockTabId1: SettingsModalTab = 'about';
const mockTabId2: SettingsModalTab = 'policy';
const mockCurrentTab: SettingsModalTab = mockTabId1;

describe('settingsModalUtils', () => {
  describe('getIsActiveTab', () => {
    it('returns true if the currentTab matches the tabId', () => {
      const isActive = getIsActiveTab(mockCurrentTab, mockTabId1);
      expect(isActive).toBe(true);
    });

    it('returns false if the currentTab does not match the tabId', () => {
      const isActive = getIsActiveTab(mockCurrentTab, mockTabId2);
      expect(isActive).toBe(false);
    });
  });

  describe('createNavigationTab', () => {
    const mockIcon = <TestFlaskIcon />;
    const mockOnClick = jest.fn();

    it('creates a LeftNavigationTab with the provided parameters', () => {
      const navigationTab: LeftNavigationTab = createNavigationTab(
        mockIcon,
        mockTabId1,
        mockOnClick,
        mockCurrentTab
      );

      expect(navigationTab.icon).toEqual(mockIcon);
      expect(navigationTab.tabName).toEqual(`settings_modal.left_nav_tab_${mockTabId1}`);
      expect(navigationTab.tabId).toEqual(mockTabId1);
      expect(navigationTab.action.type).toEqual('button');
      expect(navigationTab.action.onClick).toEqual(mockOnClick);
      expect(navigationTab.isActiveTab).toEqual(true);
    });

    it('creates a LeftNavigationTab with isActiveTab set to false when currentTab does not match tabId', () => {
      const navigationTab: LeftNavigationTab = createNavigationTab(
        mockIcon,
        mockTabId2,
        mockOnClick,
        mockCurrentTab
      );

      expect(navigationTab.isActiveTab).toEqual(false);
    });
  });
});
